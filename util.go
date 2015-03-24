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
)

func innerProduct(features1 Features, features2 Features) float64 {
	var result float64
	for key, value1 := range features1 {
		value2, _ := features2[key]
		result += value1 * value2
	}

	return result
}

func walkMatches(records Records, features Features, minScore float64, callback func(Record, float64)) {
	for _, record := range records {
		if score := innerProduct(features, record.features); score >= minScore {
			callback(record, score)
		}
	}
}

func statRecords(records Records, features Features, minScore float64) RecordStats {
	var stats RecordStats
	walkMatches(records, features, minScore, func(record Record, score float64) {
		stats.compatibility += record.compatibility
		stats.count++
	})

	return stats
}

func stepRange(bounds Bounds, steps int, callback func(float64)) {
	stepSize := (bounds.max - bounds.min) / float64(steps)

	for i := 0; i < steps; i++ {
		stepMax := bounds.max - stepSize*float64(i)
		stepMin := stepMax - stepSize
		stepMid := (stepMin + stepMax) / 2

		callback(stepMid)
	}
}

func findRecords(records Records, features Features, minScore float64) {
	var foundRecords Records

	walkMatches(records, features, minScore, func(record Record, score float64) {
		foundRecords = append(foundRecords, record)
	})

	sort.Sort(foundRecords)
}

func project(records Records, features Features, featureName string, minScore float64, bounds Bounds, steps int) []Projection {
	sampleFeatures := make(Features)
	for key, value := range features {
		sampleFeatures[key] = value
	}

	var projection []Projection
	stepRange(bounds, steps, func(sample float64) {
		sampleFeatures[featureName] = sample
		stats := statRecords(records, sampleFeatures, minScore)
		projection = append(projection, Projection{sample: sample, stats: stats})
	})

	return projection
}

func computeRecordGeo(records Records, context Context) {
	distUserMin := math.MaxFloat64
	distUserMax := 0.0

	for _, record := range records {
		if context.geo.valid {
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

	for _, record := range records {
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

func computeRecordPopularity(records Records, context Context) {
	for _, record := range records {
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

			recordProfile := make(Features)
			for groupRows.Next() {
				var categoryId int
				var categoryValue float64

				if err := groupRows.Scan(&categoryId, &categoryValue); err != nil {
					log.Fatal(err)
				}

				recordProfile[categoryId] = categoryValue
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
