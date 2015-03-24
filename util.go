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

import "sort"

func innerProduct(features1 Features, features2 Features) float32 {
	var result float32
	for key, value1 := range features1 {
		value2, _ := features2[key]
		result += value1 * value2
	}

	return result
}

func walkMatches(records Records, features Features, minScore float32, callback func(Record, float32)) {
	for _, record := range records {
		if score := innerProduct(features, record.features); score >= minScore {
			callback(record, score)
		}
	}
}

func statRecords(records Records, features Features, minScore float32) RecordStats {
	var stats RecordStats
	walkMatches(records, features, minScore, func(record Record, score float32) {
		stats.compatibility += record.compatibility
		stats.count++
	})

	return stats
}

func stepRange(rng Range, steps int, callback func(float32)) {
	stepSize := (rng.max - rng.min) / float32(steps)

	for i := 0; i < steps; i++ {
		stepMax := rng.max - stepSize*float32(i)
		stepMin := stepMax - stepSize
		stepMid := (stepMin + stepMax) / 2

		callback(stepMid)
	}
}

func findRecords(records Records, features Features, minScore float32) {
	var foundRecords Records

	walkMatches(records, features, minScore, func(record Record, score float32) {
		foundRecords = append(foundRecords, record)
	})

	sort.Sort(foundRecords)
}

func project(records Records, features Features, featureName string, minScore float32, rng Range, steps int) []Projection {
	sampleFeatures := make(Features)
	for key, value := range features {
		sampleFeatures[key] = value
	}

	var projection []Projection
	stepRange(rng, steps, func(sample float32) {
		sampleFeatures[featureName] = sample
		stats := statRecords(records, sampleFeatures, minScore)
		projection = append(projection, Projection{sample: sample, stats: stats})
	})

	return projection
}
