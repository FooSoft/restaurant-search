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

package search

import (
	"database/sql"
	"math"
	"strconv"

	"github.com/kellydunn/golang-geo"
)

func fixFeatures(features map[string]float64) map[string]float64 {
	fixedFeatures := map[string]float64{
		"nearby":        0.0,
		"accessible":    0.0,
		"delicious":     0.0,
		"accommodating": 0.0,
		"affordable":    0.0,
		"atmospheric":   0.0}

	for name := range fixedFeatures {
		if value, ok := features[name]; ok {
			fixedFeatures[name] = value
		}
	}

	return fixedFeatures
}

func fixModes(modes map[string]string) map[string]modeType {
	fixedModes := map[string]modeType{
		"nearby":        modeTypeProd,
		"accessible":    modeTypeProd,
		"delicious":     modeTypeProd,
		"accommodating": modeTypeProd,
		"affordable":    modeTypeProd,
		"atmospheric":   modeTypeProd}

	for name := range fixedModes {
		if value, ok := modes[name]; ok {
			if mode, err := parseModeType(value); err == nil {
				fixedModes[name] = mode
			}
		}
	}

	return fixedModes
}

func semanticSimilarity(features1 map[string]float64, features2 map[string]float64) float64 {
	var result float64

	for key, value1 := range features1 {
		if value2, ok := features2[key]; ok {
			result += value1 * value2
		}
	}

	return result
}

func semanticCompare(features1 map[string]float64, features2 map[string]float64, modes map[string]modeType) float64 {
	var result float64

	for key, value1 := range features1 {
		value2, _ := features2[key]

		switch mode, _ := modes[key]; mode {
		case modeTypeDist:
			result += 1 - math.Abs(value1-value2)
		case modeTypeProd:
			result += value1 * value2
		}
	}

	return result
}

func walkMatches(entries []record, features map[string]float64, modes map[string]modeType, minScore float64, callback func(record, float64)) {
	for _, entry := range entries {
		if score := semanticCompare(features, entry.features, modes); score >= minScore {
			callback(entry, score)
		}
	}
}

func statRecords(entries []record, features map[string]float64, modes map[string]modeType, minScore float64) (float64, int) {
	var (
		compatibility float64
		count         int
	)

	walkMatches(entries, features, modes, minScore, func(entry record, score float64) {
		compatibility += entry.Compatibility
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

func findRecords(entries []record, features map[string]float64, modes map[string]modeType, minScore float64) []record {
	var matchedEntries []record

	walkMatches(entries, features, modes, minScore, func(entry record, score float64) {
		entry.Score = score
		matchedEntries = append(matchedEntries, entry)
	})

	return matchedEntries
}

func project(entries []record, features map[string]float64, modes map[string]modeType, featureName string, minScore float64, steps int) []projection {
	sampleFeatures := make(map[string]float64)
	for key, value := range features {
		sampleFeatures[key] = value
	}

	var projections []projection
	stepRange(-1.0, 1.0, steps, func(sample float64) {
		sample, sampleFeatures[featureName] = sampleFeatures[featureName], sample
		compatibility, count := statRecords(entries, sampleFeatures, modes, minScore)
		sample, sampleFeatures[featureName] = sampleFeatures[featureName], sample

		projections = append(projections, projection{compatibility, count, sample})
	})

	return projections
}

func computeRecordGeo(entries []record, context queryContext) {
	distUserMin := math.MaxFloat64
	distUserMax := 0.0

	for index := range entries {
		entry := &entries[index]

		if context.geo != nil {
			userPoint := geo.NewPoint(context.geo.Latitude, context.geo.Longitude)
			entryPoint := geo.NewPoint(entry.geo.Latitude, context.geo.Longitude)
			entry.DistanceToUser = userPoint.GreatCircleDistance(entryPoint)
		}

		distUserMin = math.Min(entry.DistanceToUser, distUserMin)
		distUserMax = math.Max(entry.DistanceToUser, distUserMax)
	}

	distUserRange := distUserMax - distUserMin

	for index := range entries {
		entry := &entries[index]

		var accessible, nearby float64
		if distUserRange > 0 {
			nearby = -((entry.DistanceToUser-distUserMin)/distUserRange - 0.5) * 2.0

			accessible = 1.0 - entry.DistanceToStn/context.walkingDist
			accessible = math.Max(accessible, -1.0)
			accessible = math.Min(accessible, 1.0)
		}

		entry.features["nearby"] = nearby
		entry.features["accessible"] = accessible
	}
}

func computeRecordCompat(db *sql.DB, entries []record, context queryContext) error {
	for i := range entries {
		entry := &entries[i]

		historyRows, err := db.Query("SELECT id FROM history WHERE reviewId = (?)", entry.Id)
		if err != nil {
			return err
		}
		defer historyRows.Close()

		var (
			groupSum   float64
			groupCount int
		)

		for historyRows.Next() {
			var historyId int
			if err := historyRows.Scan(&historyId); err != nil {
				return err
			}

			groupRows, err := db.Query("SELECT categoryId, categoryValue FROM historyGroups WHERE historyId = (?)", historyId)
			if err != nil {
				return err
			}
			defer groupRows.Close()

			recordProfile := make(map[string]float64)
			for groupRows.Next() {
				var (
					categoryId    int
					categoryValue float64
				)

				if err := groupRows.Scan(&categoryId, &categoryValue); err != nil {
					return err
				}

				recordProfile[strconv.Itoa(categoryId)] = categoryValue
			}
			if err := groupRows.Err(); err != nil {
				return err
			}

			groupSum += semanticSimilarity(recordProfile, context.profile)
			groupCount++
		}
		if err := historyRows.Err(); err != nil {
			return err
		}

		if groupCount > 0 {
			entry.Compatibility = groupSum / float64(groupCount)
		}
	}

	return nil
}

func fetchRecords(db *sql.DB, context queryContext) ([]record, error) {
	rows, err := db.Query("SELECT name, urls, delicious, accommodating, affordable, atmospheric, latitude, longitude, closestStnDist, closestStnName, accessCount, id FROM reviews")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []record
	for rows.Next() {
		var (
			name, urls, closestStn                            string
			delicious, accommodating, affordable, atmospheric float64
			latitude, longitude, distanceToStn                float64
			accessCount, id                                   int
		)

		rows.Scan(
			&name,
			&urls,
			&delicious,
			&accommodating,
			&affordable,
			&atmospheric,
			&latitude,
			&longitude,
			&distanceToStn,
			&closestStn,
			&accessCount,
			&id)

		entry := record{
			Name:          name,
			Urls:          urls,
			DistanceToStn: distanceToStn,
			ClosestStn:    closestStn,
			AccessCount:   accessCount,
			geo:           geoData{latitude, longitude},
			Id:            id}

		entry.features = map[string]float64{
			"delicious":     delicious,
			"accommodating": accommodating,
			"affordable":    affordable,
			"atmospheric":   atmospheric}

		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	computeRecordGeo(entries, context)
	if err := computeRecordCompat(db, entries, context); err != nil {
		return nil, err
	}

	return entries, nil
}
