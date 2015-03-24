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

type queryContext struct {
	geo         geoContext
	latitude    float64
	longitude   float64
	profile     featureMap
	walkingDist float64
}

type queryProjection struct {
	sample float64
	stats  recordStats
}

type recordStats struct {
	compatibility float64
	count         int
}

type queryBounds struct {
	max float64
	min float64
}

type geoContext struct {
	latitude  float64
	longitude float64
	valid     bool
}

type record struct {
	accessCount    int
	compatibility  float64
	distanceToStn  float64
	distanceToUser float64
	features       featureMap
	geo            geoContext
	id             int
	name           string
	score          float64
}

type records []record

func (slice records) Len() int {
	return len(slice)
}

func (slice records) Less(i, j int) bool {
	return slice[i].score > slice[j].score
}

func (slice records) Swap(i, j int) {
	slice[i], slice[j] = slice[j], slice[i]
}

type featureMap map[interface{}]float64
