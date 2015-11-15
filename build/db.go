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
	"bytes"
	"database/sql"
	"encoding/binary"
	"hash/fnv"
)

func collateData(reviews []review) map[uint32]*restaurant {
	restaurants := make(map[uint32]*restaurant)

	for _, rev := range reviews {
		var buff bytes.Buffer
		binary.Write(&buff, binary.LittleEndian, rev.latitude)
		binary.Write(&buff, binary.LittleEndian, rev.longitude)
		binary.Write(&buff, binary.LittleEndian, rev.name)

		hash := fnv.New32()
		hash.Write(buff.Bytes())
		id := hash.Sum32()

		var rest *restaurant
		if rest, _ = restaurants[id]; rest == nil {
			rest = &restaurant{
				name:      rev.name,
				address:   rev.address,
				latitude:  rev.latitude,
				longitude: rev.longitude,
				id:        id,
			}
			restaurants[id] = rest
		}

		rest.reviews = append(rest.reviews, rev)
	}

	return restaurants
}

func computeSemantics(restaraunts map[uint32]*restaurant) {
	type definer interface {
		define(keyword string) semantics
	}

	for _, rest := range restaraunts {
		var (
			sem   semantics
			count int64
		)

		for _, rev := range rest.reviews {
			def, ok := rev.scr.(definer)
			if !ok {
				continue
			}

			for name, value := range rev.features {
				sem = sem.combine(def.define(name), float64(rev.count)*value)
			}

			count += rev.count
		}

		if count > 0 {
			rest.sem = sem.reduce(float64(count))
		}
	}
}

func computeStations(restaurants map[uint32]*restaurant, stationsPath string) error {
	sq, err := newStationQuery(stationsPath)
	if err != nil {
		return err
	}

	for _, rest := range restaurants {
		rest.closestStnName, rest.closestStnDist = sq.closestStation(rest.latitude, rest.longitude)
	}

	return nil
}

func dumpData(dbPath string, restaraunts map[uint32]*restaurant) error {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	_, err = db.Exec(`
		DROP TABLE IF EXISTS reviews;
		CREATE TABLE reviews(
			name VARCHAR(100) NOT NULL,
			address VARCHAR(400) NOT NULL,
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
		_, err = db.Exec(`
			INSERT INTO reviews(
				name,
				address,
				delicious,
				accommodating,
				affordable,
				atmospheric,
				latitude,
				longitude,
				closestStnDist,
				closestStnName,
				accessCount,
				id
			) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			rest.name,
			rest.address,
			rest.sem.Delicious,
			rest.sem.Accommodating,
			rest.sem.Affordable,
			rest.sem.Atmospheric,
			rest.latitude,
			rest.longitude,
			rest.closestStnDist,
			rest.closestStnName,
			0,
			rest.id,
		)

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
