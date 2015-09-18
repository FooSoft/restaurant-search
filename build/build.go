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
	"bufio"
	"bytes"
	"database/sql"
	"encoding/binary"
	"errors"
	"flag"
	"hash/fnv"
	"log"
	"net/url"
	"os"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/fatih/color"
	_ "github.com/mattn/go-sqlite3"
)

type scrapeCtx struct {
	gc *geoCache
	wc *webCache
}

func (s scrapeCtx) decode(address string) (float64, float64, error) {
	return s.gc.decode(address)
}

func (s scrapeCtx) load(url string) (*goquery.Document, error) {
	return s.wc.load(url)
}

type semantics struct {
	accomodating float64
	affordable   float64
	atmospheric  float64
	delicious    float64
}

type restaurant struct {
	name string

	latitude  float64
	longitude float64

	sem     semantics
	reviews []review

	closestStnName string
	closestStnDist float64
}

func scrapeData(urlsPath, geocachePath, webcachePath string) ([]review, error) {
	gc, err := newGeoCache(geocachePath)
	if err != nil {
		return nil, err
	}
	defer gc.save()

	wc, err := newWebCache(webcachePath)
	if err != nil {
		return nil, err
	}

	file, err := os.Open(urlsPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	ctx := scrapeCtx{gc, wc}
	tlog := tabelog{scrapeCtx: ctx}
	tadv := tripadvisor{scrapeCtx: ctx}

	var reviews []review
	for scanner := bufio.NewScanner(file); scanner.Scan(); {
		if line := scanner.Text(); len(line) > 0 {
			parsed, err := url.Parse(line)
			if err != nil {
				return nil, err
			}

			var revs []review
			switch parsed.Host {
			case "tabelog.com":
				revs, err = scrape(line, tlog)
			case "www.tripadvisor.com":
				revs, err = scrape(line, tadv)
			default:
				err = errors.New("unsupported review site")
			}

			if err != nil {
				return nil, err
			}

			reviews = append(reviews, revs...)
		}
	}

	return reviews, nil
}

func collateData(reviews []review) map[uint64]*restaurant {
	restaurants := make(map[uint64]*restaurant)

	for _, rev := range reviews {
		var buff bytes.Buffer
		binary.Write(&buff, binary.LittleEndian, rev.latitude)
		binary.Write(&buff, binary.LittleEndian, rev.longitude)
		binary.Write(&buff, binary.LittleEndian, rev.name)

		hash := fnv.New64()
		hash.Write(buff.Bytes())

		var rest *restaurant
		if rest, _ = restaurants[hash.Sum64()]; rest == nil {
			rest = &restaurant{name: rev.name, latitude: rev.latitude, longitude: rev.longitude}
			restaurants[hash.Sum64()] = rest
		}

		rest.reviews = append(rest.reviews, rev)
	}

	return restaurants
}

func computeStations(restaurants map[uint64]*restaurant, stationsPath string) error {
	sq, err := newStationQuery(stationsPath)
	if err != nil {
		return err
	}

	for _, rest := range restaurants {
		rest.closestStnName, rest.closestStnDist = sq.closestStation(rest.latitude, rest.longitude)
	}

	return nil
}

func computeSemantics(restaraunts map[uint64]*restaurant) {
	type definer interface {
		define(keyword string) semantics
	}
}

func dumpData(dbPath string, restaraunts map[uint64]*restaurant) error {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	_, err = db.Exec(`
		DROP TABLE IF EXISTS reviews;
		CREATE TABLE reviews(
			name VARCHAR(100) NOT NULL,
			urls VARCHAR(200) NOT NULL,
			delicious FLOAT NOT NULL,
			accommodating FLOAT NOT NULL,
			affordable FLOAT NOT NULL,
			atmospheric FLOAT NOT NULL,
			latitude FLOAT NOT NULL,
			longitude FLOAT NOT NULL,
			closestStnDist FLOAT NOT NULL,
			closestStnName VARCHAR(100) NOT NULL,
			accessCount INTEGER NOT NULL,
			id INTEGER PRIMARY KEY
		)`)

	if err != nil {
		return err
	}

	for _, rest := range restaraunts {
		var urls []string
		for _, rev := range rest.reviews {
			urls = append(urls, rev.url)
		}

		_, err = db.Exec(`
			INSERT INTO reviews(
				name,
				urls,
				delicious,
				accommodating,
				affordable,
				atmospheric,
				latitude,
				longitude,
				closestStnDist,
				closestStnName,
				accessCount
			) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			rest.name,
			strings.Join(urls, ","),
			rest.sem.delicious,
			rest.sem.accomodating,
			rest.sem.affordable,
			rest.sem.atmospheric,
			rest.latitude,
			rest.longitude,
			rest.closestStnDist,
			rest.closestStnName,
			0)

		if err != nil {
			return err
		}
	}

	_, err = db.Exec(`
		DROP TABLE IF EXISTS categories;
		CREATE TABLE categories(
			description VARCHAR(200) NOT NULL,
			id INTEGER PRIMARY KEY)`)

	if err != nil {
		return err
	}

	for _, category := range []string{"I prefer quiet places", "I enjoy Mexican Food", "I drive a car"} {
		if _, err := db.Exec("INSERT INTO categories(description) VALUES (?)", category); err != nil {
			return err
		}
	}

	_, err = db.Exec(`
		DROP TABLE IF EXISTS history;
		CREATE TABLE history(
			date DATETIME NOT NULL,
			reviewId INTEGER NOT NULL,
			id INTEGER PRIMARY KEY,
			FOREIGN KEY(reviewId) REFERENCES reviews(id))`)

	if err != nil {
		return err
	}

	_, err = db.Exec(`
		DROP TABLE IF EXISTS historyGroups;
		CREATE TABLE historyGroups(
			categoryId INTEGER NOT NULL,
			categoryValue FLOAT NOT NULL,
			historyId INTEGER NOT NULL,
			FOREIGN KEY(historyId) REFERENCES history(id),
			FOREIGN KEY(categoryId) REFERENCES categories(id))`)

	if err != nil {
		return err
	}

	return nil
}

func main() {
	dbPath := flag.String("db", "data/db.sqlite3", "database output path")
	urlsPath := flag.String("urls", "data/urls.txt", "index URLs to scrape")
	stationsPath := flag.String("stations", "data/stations.json", "station geolocation data")
	geocachePath := flag.String("geocache", "cache/geocache.json", "geolocation data cache")
	webcachePath := flag.String("webcache", "cache/webcache", "web data cache")
	flag.Parse()

	log.Print(color.BlueString("scraping data..."))
	reviews, err := scrapeData(*urlsPath, *geocachePath, *webcachePath)
	if err != nil {
		log.Fatal(err)
	}

	log.Print(color.BlueString("collating data..."))
	restaurants := collateData(reviews)

	log.Print(color.BlueString("computing data semantics.."))
	computeSemantics(restaurants)

	log.Print(color.BlueString("computing station data..."))
	if err := computeStations(restaurants, *stationsPath); err != nil {
		log.Fatal(err)
	}

	log.Print(color.BlueString("saving data..."))
	if err := dumpData(*dbPath, restaurants); err != nil {
		log.Fatal(err)
	}
}
