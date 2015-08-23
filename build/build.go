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
	"database/sql"
	"errors"
	"flag"
	"log"
	"net/url"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

func scrapeDataUrls(urlsPath string, wc *webCache, gc *geoCache) ([]restaurant, error) {
	file, err := os.Open(urlsPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var results []restaurant
	var scanner = bufio.NewScanner(file)

	for scanner.Scan() {
		if line := scanner.Text(); len(line) > 0 {
			parsed, err := url.Parse(line)
			if err != nil {
				return nil, err
			}

			var items []restaurant
			switch parsed.Host {
			case "tabelog.com":
				items = scrape(line, wc, gc, tabelog{})
			case "www.tripadvisor.com":
				items = scrape(line, wc, gc, tripadvisor{})
			default:
				return nil, errors.New("unsupported review site")
			}

			results = append(results, items...)
		}
	}

	return results, nil
}

func scrapeData(urlsPath, geocachePath, webcachePath string) ([]restaurant, error) {
	gc, err := newGeoCache(geocachePath)
	if err != nil {
		return nil, err
	}
	defer gc.save()

	wc, err := newWebCache(webcachePath)
	if err != nil {
		return nil, err
	}

	restaurants, err := scrapeDataUrls(urlsPath, wc, gc)
	if err != nil {
		return nil, err
	}

	return restaurants, nil
}

func computeStnData(restaurants []restaurant, stationsPath string) error {
	sq, err := newStationQuery(stationsPath)
	if err != nil {
		return err
	}

	for i, _ := range restaurants {
		r := &restaurants[i]
		r.closestStnName, r.closestStnDist = sq.closestStation(r.latitude, r.longitude)
	}

	return nil
}

func buildFeatures(r restaurant) (delicious, accommodating, affordable, atmospheric float64) {
	return r.features["food"], r.features["service"], r.features["value"], r.features["atmosphere"]
}

func dumpData(dbPath string, restaraunts []restaurant) error {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	_, err = db.Exec(`
		DROP TABLE IF EXISTS reviews;
		CREATE TABLE reviews(
			name VARCHAR(100) NOT NULL,
			url VARCHAR(200) NOT NULL,
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

	for _, r := range restaraunts {
		delicious, accommodating, affordable, atmospheric := buildFeatures(r)

		_, err = db.Exec(`
			INSERT INTO reviews(
				name,
				url,
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
			r.name,
			r.url,
			delicious,
			accommodating,
			affordable,
			atmospheric,
			r.longitude,
			r.latitude,
			r.closestStnDist,
			r.closestStnName,
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

	restaurants, err := scrapeData(*urlsPath, *geocachePath, *webcachePath)
	if err != nil {
		log.Fatal(err)
	}

	if err := computeStnData(restaurants, *stationsPath); err != nil {
		log.Fatal(err)
	}

	if err := dumpData(*dbPath, restaurants); err != nil {
		log.Fatal(err)
	}
}
