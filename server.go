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
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"

	"github.com/GaryBoone/GoStats/stats"
	_ "github.com/go-sql-driver/mysql"
)

var db *sql.DB

func executeQuery(rw http.ResponseWriter, req *http.Request) {
	var request jsonQueryRequest
	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	var geo *geoData
	if request.Geo != nil {
		geo = &geoData{request.Geo.Latitude, request.Geo.Longitude}
	}

	entries := getRecords(queryContext{geo, request.Profile, request.WalkingDist})
	features := fixFeatures(request.Features)

	minScore := request.MinScore
	if request.Bracket != nil {
		bracket := namedBracket{
			request.Bracket.Name,
			request.Bracket.Min,
			request.Bracket.Max}

		minScore = calibrateMinScore(entries, features, bracket)
	}

	foundEntries := findRecords(entries, features, minScore)
	sorter := recordSorter{entries: foundEntries, key: request.SortKey, ascending: request.SortAsc}
	sorter.sort()

	response := jsonQueryResponse{
		Count:    len(foundEntries),
		Columns:  make(map[string]jsonColumn),
		MinScore: minScore,
		Records:  make([]jsonRecord, 0)}

	for name, value := range features {
		column := jsonColumn{
			Bracket: jsonBracket{Max: -1, Min: 1},
			Value:   value,
			Steps:   request.Resolution}

		hints := project(
			entries,
			features,
			name,
			minScore,
			request.Resolution)

		for _, hint := range hints {
			jsonHint := jsonProjection{hint.compatibility, hint.count, hint.sample}
			column.Hints = append(column.Hints, jsonHint)
		}

		var d stats.Stats
		for _, record := range foundEntries {
			if feature, ok := record.features[name]; ok {
				d.Update(feature)
			}
		}

		if d.Count() > 0 {
			var dev float64
			if d.Count() > 1 {
				dev = d.SampleStandardDeviation() * 3
			}

			mean := d.Mean()

			column.Bracket.Max = math.Min(mean+dev, d.Max())
			column.Bracket.Min = math.Max(mean-dev, d.Min())
		}

		response.Columns[name] = column
	}

	for index, record := range foundEntries {
		if index >= request.MaxResults {
			break
		}

		item := jsonRecord{
			Name:           record.name,
			Url:            record.url,
			Score:          record.score,
			Compatibility:  record.compatibility,
			DistanceToUser: record.distanceToUser,
			DistanceToStn:  record.distanceToStn,
			ClosestStn:     record.closestStn,
			AccessCount:    record.accessCount,
			Id:             record.id}

		response.Records = append(response.Records, item)
	}

	js, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func getCategories(rw http.ResponseWriter, req *http.Request) {
	categoryRows, err := db.Query("SELECT description, id FROM categories")
	if err != nil {
		log.Fatal(err)
	}
	defer categoryRows.Close()

	var categories []jsonCategory
	for categoryRows.Next() {
		var (
			description string
			id          int
		)

		if err := categoryRows.Scan(&description, &id); err != nil {
			log.Fatal(err)
		}

		categories = append(categories, jsonCategory{description, id})
	}

	if err := categoryRows.Err(); err != nil {
		log.Fatal(err)
	}

	js, err := json.Marshal(categories)
	if err != nil {
		log.Fatal(err)
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func addCategory(rw http.ResponseWriter, req *http.Request) {
	var request jsonAddCategoryRequest
	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	response := jsonAddCategoryResponse{Description: strings.TrimSpace(request.Description)}

	if len(request.Description) > 0 {
		result, err := db.Exec("INSERT INTO categories(description) VALUES(?)", request.Description)
		if err != nil {
			log.Fatal(err)
		}

		insertId, err := result.LastInsertId()
		if err != nil {
			log.Fatal(err)
		}

		affectedRows, err := result.RowsAffected()
		if err != nil {
			log.Fatal(err)
		}

		response.Success = affectedRows > 0
		response.Id = int(insertId)
	}

	js, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func removeCategory(rw http.ResponseWriter, req *http.Request) {
	var request jsonRemoveCategoryRequest
	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err := db.Exec("DELETE FROM categories WHERE id = (?)", request.Id)

	js, err := json.Marshal(jsonRemoveCategoryResponse{err == nil})
	if err != nil {
		log.Fatal(err)
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func accessReview(rw http.ResponseWriter, req *http.Request) {
	var request jsonAccessRequest
	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	reviewsResult, err := db.Exec("UPDATE reviews SET accessCount = accessCount + 1 WHERE id = (?)", request.Id)
	if err != nil {
		log.Fatal(err)
	}

	rowsAffected, err := reviewsResult.RowsAffected()
	if err != nil {
		log.Fatal(err)
	}

	if rowsAffected == 0 || len(request.Profile) == 0 {
		return
	}

	historyResult, err := db.Exec("INSERT INTO history(date, reviewId) VALUES(NOW(), ?)", request.Id)
	if err != nil {
		log.Fatal(err)
	}

	insertId, err := historyResult.LastInsertId()
	if err != nil {
		log.Fatal(err)
	}

	for id, value := range request.Profile {
		catRow := db.QueryRow("SELECT EXISTS(SELECT NULL FROM categories WHERE id = ?)", id)

		var catExists int
		if err := catRow.Scan(&catExists); err != nil {
			log.Fatal(err)
		}

		if catExists == 0 {
			continue
		}

		if _, err := db.Exec("INSERT INTO historyGroups(categoryId, categoryValue, historyId) VALUES(?, ?, ?)", id, value, insertId); err != nil {
			log.Fatal(err)
		}
	}
}

func clearHistory(rw http.ResponseWriter, req *http.Request) {
	if _, err := db.Exec("DELETE FROM historyGroups"); err != nil {
		log.Fatal(err)
	}

	if _, err := db.Exec("DELETE FROM history"); err != nil {
		log.Fatal(err)
	}

	rw.Header().Set("Content-Type", "text/plain")
	fmt.Fprint(rw, "History tables cleared")
}

func main() {
	staticDir := flag.String("static", "static", "path to static files")
	portNum := flag.Int("port", 8080, "port to serve content on")
	dataSrc := flag.String("data", "hscd@/hscd", "data source for database")
	flag.Parse()

	var err error
	db, err = sql.Open("mysql", *dataSrc)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	http.HandleFunc("/query", executeQuery)
	http.HandleFunc("/categories", getCategories)
	http.HandleFunc("/learn", addCategory)
	http.HandleFunc("/forget", removeCategory)
	http.HandleFunc("/access", accessReview)
	http.HandleFunc("/clear", clearHistory)
	http.Handle("/", http.FileServer(http.Dir(*staticDir)))

	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *portNum), nil))
}
