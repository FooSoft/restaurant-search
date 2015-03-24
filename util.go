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

type Features map[string]float32

type Record struct {
	features      Features
	compatibility float32
}

type RecordStats struct {
	compatibility float32
	count         int
}

type Range struct {
	min float32
	max float32
}

func innerProduct(features1 Features, features2 Features) float32 {
	var result float32
	for key, value1 := range features1 {
		value2, _ := features2[key]
		result += value1 * value2
	}

	return result
}

func walkMatches(records []Record, features Features, minScore float32, callback func(Record, float32)) {
	for _, record := range records {
		if score := innerProduct(features, record.features); score >= minScore {
			callback(record, score)
		}
	}
}

func statRecords(records []Record, features Features, minScore float32) RecordStats {
	var stats RecordStats
	walkMatches(records, features, minScore, func(record Record, score float32) {
		stats.compatibility += record.compatibility
		stats.count++
	})

	return stats
}

func step(rng Range, steps int, minScore float32, callback func(float32)) {
	stepSize := (rng.max - rng.min) / float32(steps)

	for i := 0; i < steps; i++ {
		stepMax := rng.max - stepSize*float32(i)
		stepMin := stepMax - stepSize
		stepMid := (stepMin + stepMax) / 2

		callback(stepMid)
	}
}

// function findRecords(data, features, minScore) {
//     var results = [];

//     walkMatches(data, features, minScore, function(record, score) {
//         results.push({
//             name:           record.name,
//             score:          score,
//             distanceToUser: record.distanceToUser / 1000.0,
//             distanceToStn:  record.distanceToStn / 1000.0,
//             closestStn:     record.closestStn,
//             accessCount:    record.accessCount,
//             id:             record.id
//         });
//     });

//     results.sort(function(a, b) {
//         return b.score - a.score;
//     });

//     return results;
// }

// function project(data, features, feature, minScore, range, steps) {
//     var sample  = _.clone(features);
//     var results = [];

//     step(range, steps, function(position) {
//         sample[feature] = position;
//         results.push({
//             sample: position,
//             stats:  statRecords(data, sample, minScore)
//         });
//     });

//     return results;
// }

// function buildHints(data, features, feature, minScore, range, steps) {
//     var projection = project(
//         data,
//         features,
//         feature,
//         minScore,
//         range,
//         steps
//     );

//     var hints = [];
//     _.each(projection, function(result) {
//         hints.push({
//             sample: result.sample,
//             stats:  result.stats
//         });
//     });

//     return hints;
// }
