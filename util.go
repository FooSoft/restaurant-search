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
	"strconv"
)

func fixFeatures(features featureMap) featureMap {
	fixedFeatures := featureMap{
		"nearby":       0.0,
		"accessible":   0.0,
		"delicious":    0.0,
		"accomodating": 0.0,
		"affordable":   0.0,
		"atmospheric":  0.0}

	for name, _ := range fixedFeatures {
		value, _ := features[name]
		fixedFeatures[name] = value
	}

	return fixedFeatures
}

func innerProduct(features1 featureMap, features2 featureMap) float64 {
	var result float64
	for key, value1 := range features1 {
		value2, _ := features2[key]
		result += value1 * value2
	}

	return result
}

func walkMatches(entries records, features featureMap, minScore float64, callback func(record, float64)) {
	for _, entry := range entries {
		if score := innerProduct(features, entry.features); score >= minScore {
			callback(entry, score)
		}
	}
}

func statRecords(entries records, features featureMap, minScore float64) (float64, int) {
	var compatibility float64
	var count int

	walkMatches(entries, features, minScore, func(entry record, score float64) {
		compatibility += entry.compatibility
		count++
	})

	return compatibility, count
}

func stepRange(min, max float64, steps int, callback func(float64)) {
	stepSize := (max - min) / float64(steps)

	for i := 0; i < steps; i++ {
		stepMax := max - stepSize*float64(i)
		stepMin := stepMax - stepSize
		stepMid := (stepMin + stepMax) / 2

		callback(stepMid)
	}
}

func findRecords(entries records, features featureMap, minScore float64) records {
	var foundEntries records

	walkMatches(entries, features, minScore, func(entry record, score float64) {
		entry.score = score
		foundEntries = append(foundEntries, entry)
	})

	return foundEntries
}

func project(entries records, features featureMap, featureName string, minScore float64, steps int) []queryProjection {
	sampleFeatures := make(featureMap)
	for key, value := range features {
		sampleFeatures[key] = value
	}

	var projection []queryProjection
	stepRange(-1.0, 1.0, steps, func(sample float64) {
		sample, sampleFeatures[featureName] = sampleFeatures[featureName], sample
		compatibility, count := statRecords(entries, sampleFeatures, minScore)
		sample, sampleFeatures[featureName] = sampleFeatures[featureName], sample

		projection = append(projection, queryProjection{compatibility, count, sample})
	})

	return projection
}

func computeRecordGeo(entries records, context queryContext) {
	distUserMin := math.MaxFloat64
	distUserMax := 0.0

	for index := range entries {
		entry := &entries[index]

		if context.geo != nil {
			userPoint := geo.NewPoint(context.geo.latitude, context.geo.longitude)
			entryPoint := geo.NewPoint(entry.geo.latitude, context.geo.longitude)
			entry.distanceToUser = userPoint.GreatCircleDistance(entryPoint)
		}

		distUserMin = math.Min(entry.distanceToUser, distUserMin)
		distUserMax = math.Max(entry.distanceToUser, distUserMax)
	}

	distUserRange := distUserMax - distUserMin

	for index := range entries {
		entry := &entries[index]

		var accessible, nearby float64
		if distUserRange > 0 {
			nearby = -((entry.distanceToUser-distUserMin)/distUserRange - 0.5) * 2.0

			accessible = 1.0 - (entry.distanceToStn / context.walkingDist)
			accessible = math.Max(accessible, -1.0)
			accessible = math.Min(accessible, 1.0)
		}

		entry.features["nearby"] = nearby
		entry.features["accessible"] = accessible
	}
}

func computeRecordPopularity(entries records, context queryContext) {
	for index := range entries {
		entry := &entries[index]

		historyRows, err := db.Query("SELECT id FROM history WHERE reviewId = (?)", entry.id)
		if err != nil {
			log.Fatal(err)
		}
		defer historyRows.Close()

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
			defer groupRows.Close()

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

		if groupCount > 0 {
			entry.compatibility = groupSum / float64(groupCount)
		}
	}
}

func getRecords(context queryContext) records {
	recordRows, err := db.Query("SELECT name, url, delicious, accomodating, affordable, atmospheric, latitude, longitude, distanceToStn, closestStn, accessCount, id FROM reviews")
	if err != nil {
		log.Fatal(err)
	}
	defer recordRows.Close()

	var entries []record
	for recordRows.Next() {
		var name, url, closestStn string
		var delicious, accomodating, affordable, atmospheric, latitude, longitude, distanceToStn float64
		var accessCount, id int

		recordRows.Scan(
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
			url:           "http://www.tripadvisor.com" + url,
			distanceToStn: distanceToStn,
			closestStn:    closestStn,
			accessCount:   accessCount,
			geo:           geoData{latitude, longitude},
			id:            id}

		entry.features = featureMap{
			"delicious":    delicious,
			"accomodating": accomodating,
			"affordable":   affordable,
			"atmospheric":  atmospheric}

		entries = append(entries, entry)
	}
	if err := recordRows.Err(); err != nil {
		log.Fatal(err)
	}

	computeRecordPopularity(entries, context)
	computeRecordGeo(entries, context)

	return entries
}
