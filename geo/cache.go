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

package geo

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"time"

	"github.com/kellydunn/golang-geo"
)

type Coord struct {
	Latitude  float64
	Longitude float64
}

type Cache struct {
	filename string
	data     map[string]Coord
	ticker   *time.Ticker
	coder    geo.GoogleGeocoder
}

func NewCache(filename string) (*Cache, error) {
	cache := &Cache{
		filename: filename,
		data:     make(map[string]Coord),
		ticker:   time.NewTicker(time.Millisecond * 200),
	}

	if err := cache.load(); err != nil {
		return nil, err
	}

	return cache, nil
}

func (c *Cache) load() error {
	file, err := os.Open(c.filename)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	defer file.Close()

	return json.NewDecoder(file).Decode(&c.data)
}

func (c *Cache) Save() error {
	js, err := json.MarshalIndent(c.data, "", "    ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(c.filename, js, 0644)
}

func (c *Cache) Decode(address string) (Coord, error) {
	if coord, ok := c.data[address]; ok {
		return coord, nil
	}

	<-c.ticker.C

	point, err := c.coder.Geocode(address)
	if err != nil {
		return Coord{}, err
	}

	coord := Coord{point.Lat(), point.Lng()}
	c.data[address] = coord
	return coord, nil
}
