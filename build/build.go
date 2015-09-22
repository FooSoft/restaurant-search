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
	"flag"
	"fmt"
	"log"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

type restaurant struct {
	name    string
	address string
	reviews []review
	sem     semantics

	latitude  float64
	longitude float64

	closestStnName string
	closestStnDist float64

	id uint32
}

func loadConverters(directory string) ([]*converter, error) {
	matches, err := filepath.Glob(filepath.Join(directory, "*.toml"))
	if err != nil {
		return nil, err
	}

	var convs []*converter
	for _, match := range matches {
		conv, err := newConverter(match)
		if err != nil {
			return nil, err
		}

		convs = append(convs, conv)
	}

	return convs, nil
}

func scrapeReviews(urls []string, converters []*converter, gc *geoCache, wc *webCache) ([]review, error) {
	var reviews []review

	for _, u := range urls {
		var scraped bool

		for _, c := range converters {
			if !c.compatible(u) {
				continue
			}

			revs, err := scrape(u, c, gc, wc)
			if err != nil {
				return nil, err
			}

			reviews = append(reviews, revs...)
			scraped = true
			break
		}

		if !scraped {
			return nil, fmt.Errorf("no converters found for %s", u)
		}
	}

	return reviews, nil
}

func main() {
	var (
		dbPath         = flag.String("db", "data/db.sqlite3", "database output path")
		convertersPath = flag.String("converters", "data/converters", "directory for converters")
		stationsPath   = flag.String("stations", "data/stations.json", "station geolocation data")
		geocachePath   = flag.String("geocache", "cache/geocache.json", "geolocation data cache")
		webcachePath   = flag.String("webcache", "cache/webcache", "web data cache")
	)

	flag.Parse()

	if flag.NArg() == 0 {
		log.Fatal("no URLs specified on command line")
	}

	log.Printf("loading geocache from %s...", *geocachePath)
	gc, err := newGeoCache(*geocachePath)
	if err != nil {
		log.Fatal(err)
	}
	defer gc.save()

	log.Printf("loading webcache from %s...", *webcachePath)
	wc, err := newWebCache(*webcachePath)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("loading converters from %s...", *convertersPath)
	converters, err := loadConverters(*convertersPath)
	if err != nil {
		log.Fatal(err)
	}
	for _, c := range converters {
		log.Printf("*\t%s", c.Name)
	}

	log.Print("scraping reviews...")
	reviews, err := scrapeReviews(flag.Args(), converters, gc, wc)
	if err != nil {
		log.Fatal(err)
	}

	log.Print("collating data...")
	restaurants := collateData(reviews)

	log.Print("computing data semantics..")
	computeSemantics(restaurants)

	log.Printf("computing station data from %s...", *stationsPath)
	if err := computeStations(restaurants, *stationsPath); err != nil {
		log.Fatal(err)
	}

	log.Printf("saving data to %s...", *dbPath)
	if err := dumpData(*dbPath, restaurants); err != nil {
		log.Fatal(err)
	}
}
