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
	"errors"
	"sort"
)

type modeType int

const (
	modeTypeProd modeType = iota + 1
	modeTypeDist
)

type bracket struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type column struct {
	Bracket bracket      `json:"bracket"`
	Hints   []projection `json:"hints"`
	Mode    string       `json:"mode"`
	Steps   int          `json:"steps"`
	Value   float64      `json:"value"`
}

type projection struct {
	Compatibility float64 `json:"compatibility"`
	Count         int     `json:"count"`
	Sample        float64 `json:"sample"`
}

type record struct {
	AccessCount    int     `json:"accessCount"`
	ClosestStn     string  `json:"closestStn"`
	Compatibility  float64 `json:"compatibility"`
	DistanceToStn  float64 `json:"distanceToStn"`
	DistanceToUser float64 `json:"distanceToUser"`
	Id             int     `json:"id"`
	Name           string  `json:"name"`
	Score          float64 `json:"score"`
	Address        string  `json:"address"`
	features       map[string]float64
	geo            geoData
}

type queryContext struct {
	geo         *geoData
	profile     map[string]float64
	walkingDist float64
}

type geoData struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type recordSorter struct {
	ascending bool
	entries   []record
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
		return entry1.AccessCount < entry2.AccessCount
	case "closestStn":
		return entry1.ClosestStn < entry2.ClosestStn
	case "compatibility":
		return entry1.Compatibility < entry2.Compatibility
	case "distanceToStn":
		return entry1.DistanceToStn < entry2.DistanceToStn
	case "distanceToUser":
		return entry1.DistanceToUser < entry2.DistanceToUser
	case "name":
		return entry1.Name < entry2.Name
	default:
		return entry1.Score < entry2.Score
	}
}

func (s recordSorter) Swap(i, j int) {
	s.entries[i], s.entries[j] = s.entries[j], s.entries[i]
}

func (m modeType) String() string {
	switch m {
	case modeTypeProd:
		return "product"
	case modeTypeDist:
		return "distance"
	default:
		return ""
	}
}

func parseModeType(mode string) (modeType, error) {
	switch mode {
	case "product":
		return modeTypeProd, nil
	case "distance":
		return modeTypeDist, nil
	default:
		return 0, errors.New("invalid mode type")
	}
}
