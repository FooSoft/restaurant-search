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

type featureMap map[string]float64

type jsonAccessRequest struct {
	Id      int        `json:"id"`
	Profile featureMap `json:"profile"`
}

type jsonGeoData struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type jsonQueryRequest struct {
	Features    featureMap   `json:"features"`
	Geo         *jsonGeoData `json:"geo"`
	MaxResults  int          `json:"maxResults"`
	MinScore    float64      `json:"minScore"`
	Profile     featureMap   `json:"profile"`
	Resolution  int          `json:"resolution"`
	SortAsc     bool         `json:"sortAsc"`
	SortKey     string       `json:"sortKey"`
	WalkingDist float64      `json:"walkingDist"`
}

type jsonColumn struct {
	Hints []jsonProjection `json:"hints"`
	Steps int              `json:"steps"`
	Value float64          `json:"value"`
}

type jsonProjection struct {
	Compatibility float64 `json:"compatibility"`
	Count         int     `json:"count"`
	Sample        float64 `json:"sample"`
}

type jsonRecord struct {
	AccessCount    int     `json:"accessCount"`
	ClosestStn     string  `json:"closestStn"`
	Compatibility  float64 `json:"compatibility"`
	DistanceToStn  float64 `json:"distanceToStn"`
	DistanceToUser float64 `json:"distanceToUser"`
	Id             int     `json:"id"`
	Name           string  `json:"name"`
	Score          float64 `json:"score"`
	Url            string  `json:"url"`
}

type jsonRange struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type jsonQueryResponse struct {
	Columns map[string]jsonColumn `json:"columns"`
	Count   int                   `json:"count"`
	Ranges  map[string]jsonRange  `json:"ranges"`
	Records []jsonRecord          `json:"records"`
}

type jsonCategory struct {
	Description string `json:"description"`
	Id          int    `json:"id"`
}

type jsonAddCategoryRequest struct {
	Description string `json:"description"`
}

type jsonAddCategoryResponse struct {
	Description string `json:"description"`
	Id          int    `json:"id"`
	Success     bool   `json:"success"`
}

type jsonRemoveCategoryRequest struct {
	Id int `json:"id"`
}

type jsonRemoveCategoryResponse struct {
	Success bool `json:"success"`
}

type queryContext struct {
	geo         *geoData
	profile     featureMap
	walkingDist float64
}

type queryProjection struct {
	compatibility float64
	count         int
	sample        float64
}

type geoData struct {
	latitude  float64
	longitude float64
}

type record struct {
	accessCount    int
	closestStn     string
	compatibility  float64
	distanceToStn  float64
	distanceToUser float64
	features       featureMap
	geo            geoData
	id             int
	name           string
	score          float64
	url            string
}

type records []record

type recordSorter struct {
	ascending bool
	entries   records
	key       string
}

func (s recordSorter) sort() {
	if s.ascending {
		sort.Sort(s)
	} else {
		sort.Sort(sort.Reverse(s))
	}
}

func (s recordSorter) Len() int {
	return len(s.entries)
}

func (s recordSorter) Less(i, j int) bool {
	entry1 := s.entries[i]
	entry2 := s.entries[j]

	switch s.key {
	case "accessCount":
		return entry1.accessCount < entry2.accessCount
	case "closestStn":
		return entry1.closestStn < entry2.closestStn
	case "compatibility":
		return entry1.compatibility < entry2.compatibility
	case "distanceToStn":
		return entry1.distanceToStn < entry2.distanceToStn
	case "distanceToUser":
		return entry1.distanceToUser < entry2.distanceToUser
	case "name":
		return entry1.name < entry2.name
	default:
		return entry1.score < entry2.score
	}
}

func (s recordSorter) Swap(i, j int) {
	s.entries[i], s.entries[j] = s.entries[j], s.entries[i]
}
