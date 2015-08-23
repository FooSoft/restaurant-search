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
	"encoding/json"
	"math"
	"os"

	"github.com/kellydunn/golang-geo"
)

type station struct {
	Latitude  float64
	Longitude float64
}

type stationQuery struct {
	stations map[string]station
}

func newStationQuery(filename string) (*stationQuery, error) {
	s := new(stationQuery)

	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	if err := json.NewDecoder(file).Decode(&s.stations); err != nil {
		return nil, err
	}

	return s, nil
}

func (s *stationQuery) closestStation(latitude, longitude float64) (name string, distance float64) {
	queryPt := geo.NewPoint(latitude, longitude)

	var closestStn string
	minDist := math.MaxFloat64

	for name, station := range s.stations {
		stnPt := geo.NewPoint(station.Latitude, station.Longitude)
		if currDist := queryPt.GreatCircleDistance(stnPt); currDist < minDist {
			closestStn = name
			minDist = currDist
		}
	}

	return closestStn, minDist
}
