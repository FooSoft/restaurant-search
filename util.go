/*
 * Copyright (c) 2015 Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

package main

import (
	"github.com/kellydunn/golang-geo"
	"log"
	"math"
	"sort"
	"strconv"
)

func innerProduct(features1 featureMap, features2 featureMap) float64 {
	var result float64
	for key, value1 := range features1 {
		value2, _ := features2[key]
		result += value1 * value2
	}

	return result
}

func walkMatches(entries records, features featureMap, minScore float64, callback func(record, float64)) {
	for _, record := range entries {
		if score := innerProduct(features, record.features); score >= minScore {
			callback(record, score)
		}
	}
}

func statRecords(entries records, features featureMap, minScore float64) recordStats {
	var stats recordStats
	walkMatches(entries, features, minScore, func(record record, score float64) {
		stats.compatibility += record.compatibility
		stats.count++
	})

	return stats
}

func stepRange(bounds queryBounds, steps int, callback func(float64)) {
	stepSize := (bounds.max - bounds.min) / float64(steps)

	for i := 0; i < steps; i++ {
		stepMax := bounds.max - stepSize*float64(i)
		stepMin := stepMax - stepSize
		stepMid := (stepMin + stepMax) / 2

		callback(stepMid)
	}
}

func findRecords(entries records, features featureMap, minScore float64) records {
	var foundEntries records

	walkMatches(entries, features, minScore, func(record record, score float64) {
		foundEntries = append(foundEntries, record)
	})

	sort.Sort(foundEntries)
	return foundEntries
}

func project(entries records, features featureMap, featureName string, minScore float64, bounds queryBounds, steps int) []queryProjection {
	sampleFeatures := make(featureMap)
	for key, value := range features {
		sampleFeatures[key] = value
	}

	var projection []queryProjection
	stepRange(bounds, steps, func(sample float64) {
		sampleFeatures[featureName] = sample
		stats := statRecords(entries, sampleFeatures, minScore)
		projection = append(projection, queryProjection{sample: sample, stats: stats})
	})

	return projection
}

func computeRecordGeo(entries records, context queryContext) {
	distUserMin := math.MaxFloat64
	distUserMax := 0.0

	for _, record := range entries {
		if context.geo != nil {
			userPoint := geo.NewPoint(context.geo.latitude, context.geo.longitude)
			recordPoint := geo.NewPoint(record.geo.latitude, context.geo.longitude)
			record.distanceToUser = userPoint.GreatCircleDistance(recordPoint)
		}

		if record.distanceToUser < distUserMin {
			distUserMin = record.distanceToUser
		}
		if record.distanceToUser > distUserMax {
			distUserMax = record.distanceToUser
		}
	}

	distUserRange := distUserMax - distUserMin

	for _, record := range entries {
		nearby := -((record.distanceToUser-distUserMin)/distUserRange - 0.5) * 2.0

		accessible := 1.0 - (record.distanceToStn / context.walkingDist)
		if accessible < -1.0 {
			accessible = 1.0
		} else if accessible > 1.0 {
			accessible = 1.0
		}

		record.features["nearby"] = nearby
		record.features["accessible"] = accessible
	}
}

func computeRecordPopularity(entries records, context queryContext) {
	for _, record := range entries {
		historyRows, err := db.Query("SELECT id FROM history WHERE reviewId = (?)", record.id)
		if err != nil {
			log.Fatal(err)
		}

		var groupSum float64
		var groupCount int

		for historyRows.Next() {
			var historyId int
			if err := historyRows.Scan(&historyId); err != nil {
				log.Fatal(err)
			}

			groupRows, err := db.Query("SELECT categoryId, categoryValue FROM historyGroups WHERE historyId = (?)", historyId)
			if err != nil {
				log.Fatal(err)
			}

			recordProfile := make(featureMap)
			for groupRows.Next() {
				var categoryId int
				var categoryValue float64

				if err := groupRows.Scan(&categoryId, &categoryValue); err != nil {
					log.Fatal(err)
				}

				recordProfile[strconv.Itoa(categoryId)] = categoryValue
			}
			if err := groupRows.Err(); err != nil {
				log.Fatal(err)
			}

			groupSum += innerProduct(recordProfile, context.profile)
			groupCount++
		}
		if err := historyRows.Err(); err != nil {
			log.Fatal(err)
		}

		var compatibility float64
		if groupCount > 0 {
			compatibility = groupSum / float64(groupCount)
		}

		record.features["compatibility"] = compatibility
	}
}

func getRecords(context queryContext) records {
	rows, err := db.Query("SELECT name, url, delicious, accomodating, affordable, atmospheric, latitude, longitude, distanceToStn, closestStn, accessCount, id FROM reviews")
	if err != nil {
		log.Fatal(err)
	}

	var entries []record
	for rows.Next() {
		var name, url, closestStn string
		var delicious, accomodating, affordable, atmospheric, latitude, longitude, distanceToStn float64
		var accessCount, id int

		rows.Scan(
			&name,
			&url,
			&delicious,
			&accomodating,
			&affordable,
			&atmospheric,
			&latitude,
			&longitude,
			&distanceToStn,
			&closestStn,
			&accessCount,
			&id)

		entry := record{
			name:          name,
			url:           url,
			distanceToStn: distanceToStn,
			closestStn:    closestStn,
			accessCount:   accessCount,
			id:            id}

		entry.features = make(featureMap)
		entry.features["delicious"] = delicious
		entry.features["accomodating"] = accomodating
		entry.features["affordable"] = affordable
		entry.features["atmospheric"] = atmospheric
		entry.geo = geoContext{latitude, longitude}

		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}

	return entries
}
