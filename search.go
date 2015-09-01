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
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/GaryBoone/GoStats/stats"
	_ "github.com/mattn/go-sqlite3"
)

var dataSrc string

func handleExecuteQuery(rw http.ResponseWriter, req *http.Request) {
	startTime := time.Now()

	db, err := sql.Open("sqlite3", dataSrc)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	var (
		request struct {
			Features    map[string]float64 `json:"features"`
			Geo         *geoData           `json:"geo"`
			MaxResults  int                `json:"maxResults"`
			MinScore    float64            `json:"minScore"`
			Modes       map[string]string  `json:"modes"`
			Profile     map[string]float64 `json:"profile"`
			Resolution  int                `json:"resolution"`
			SortAsc     bool               `json:"sortAsc"`
			SortKey     string             `json:"sortKey"`
			WalkingDist float64            `json:"walkingDist"`
		}

		response struct {
			Columns     map[string]*column `json:"columns"`
			Count       int                `json:"count"`
			MinScore    float64            `json:"minScore"`
			Records     []record           `json:"records"`
			ElapsedTime int64              `json:"elapsedTime"`
		}
	)

	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	var geo *geoData
	if request.Geo != nil {
		geo = &geoData{request.Geo.Latitude, request.Geo.Longitude}
	}

	allEntries, err := fetchRecords(db, queryContext{geo, request.Profile, request.WalkingDist})
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	features := fixFeatures(request.Features)
	modes := fixModes(request.Modes)

	matchedEntries := findRecords(allEntries, features, modes, request.MinScore)
	sorter := recordSorter{entries: matchedEntries, key: request.SortKey, ascending: request.SortAsc}
	sorter.sort()

	var wg sync.WaitGroup
	wg.Add(len(features))

	response.Columns = make(map[string]*column)
	for name := range features {
		response.Columns[name] = new(column)

		go func(name string) {
			defer wg.Done()

			col := response.Columns[name]

			col.Bracket = bracket{Max: -1.0, Min: 1.0}
			col.Hints = project(allEntries, features, modes, name, request.MinScore, request.Resolution)
			col.Mode = modes[name].String()
			col.Steps = request.Resolution
			col.Value = features[name]

			var d stats.Stats
			for _, record := range matchedEntries {
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

				col.Bracket.Max = math.Min(mean+dev, d.Max())
				col.Bracket.Min = math.Max(mean-dev, d.Min())
			}
		}(name)
	}

	wg.Wait()

	response.Count = len(matchedEntries)
	response.MinScore = request.MinScore
	response.ElapsedTime = time.Since(startTime).Nanoseconds()

	if len(matchedEntries) > request.MaxResults {
		response.Records = matchedEntries[:request.MaxResults]
	} else {
		response.Records = matchedEntries
	}

	js, err := json.Marshal(response)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func handleGetCategories(rw http.ResponseWriter, req *http.Request) {
	db, err := sql.Open("sqlite3", dataSrc)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	categoryRows, err := db.Query("SELECT description, id FROM categories")
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	defer categoryRows.Close()

	type category struct {
		Description string `json:"description"`
		Id          int    `json:"id"`
	}

	var response []category
	for categoryRows.Next() {
		var (
			description string
			id          int
		)

		if err := categoryRows.Scan(&description, &id); err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		response = append(response, category{description, id})
	}

	if err := categoryRows.Err(); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	js, err := json.Marshal(response)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func handleAddCategory(rw http.ResponseWriter, req *http.Request) {
	db, err := sql.Open("sqlite3", dataSrc)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	var (
		request struct {
			Description string `json:"description"`
		}

		response struct {
			Description string `json:"description"`
			Id          int    `json:"id"`
			Success     bool   `json:"success"`
		}
	)

	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	response.Description = strings.TrimSpace(request.Description)

	if len(response.Description) > 0 {
		result, err := db.Exec("INSERT INTO categories(description) VALUES(?)", request.Description)
		if err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		insertId, err := result.LastInsertId()
		if err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		rows, err := result.RowsAffected()
		if err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		response.Success = rows > 0
		response.Id = int(insertId)
	}

	js, err := json.Marshal(response)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func handleRemoveCategory(rw http.ResponseWriter, req *http.Request) {
	db, err := sql.Open("sqlite3", dataSrc)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	var (
		request struct {
			Id int `json:"id"`
		}

		response struct {
			Success bool `json:"success"`
		}
	)

	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err := db.Exec("DELETE FROM categories WHERE id = (?)", request.Id); err == nil {
		response.Success = true
	}

	js, err := json.Marshal(response)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func handleAccessReview(rw http.ResponseWriter, req *http.Request) {
	db, err := sql.Open("sqlite3", dataSrc)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	var request struct {
		Id      int                `json:"id"`
		Profile map[string]float64 `json:"profile"`
	}

	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	reviewsResult, err := db.Exec("UPDATE reviews SET accessCount = accessCount + 1 WHERE id = (?)", request.Id)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, err := reviewsResult.RowsAffected()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 || len(request.Profile) == 0 {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	historyResult, err := db.Exec("INSERT INTO history(date, reviewId) VALUES(NOW(), ?)", request.Id)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	insertId, err := historyResult.LastInsertId()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	for id, value := range request.Profile {
		catRow := db.QueryRow("SELECT EXISTS(SELECT NULL FROM categories WHERE id = ?)", id)

		var catExists int
		if err := catRow.Scan(&catExists); err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		if catExists == 0 {
			continue
		}

		if _, err := db.Exec("INSERT INTO historyGroups(categoryId, categoryValue, historyId) VALUES(?, ?, ?)", id, value, insertId); err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func handleClearHistory(rw http.ResponseWriter, req *http.Request) {
	db, err := sql.Open("sqlite3", dataSrc)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	if _, err := db.Exec("DELETE FROM historyGroups"); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err := db.Exec("DELETE FROM history"); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "text/plain")
	fmt.Fprint(rw, "History tables cleared")
}

func NewSearchApp(sd, ds string) *http.ServeMux {
	dataSrc = ds

	mux := http.NewServeMux()
	mux.HandleFunc("/query", handleExecuteQuery)
	mux.HandleFunc("/categories", handleGetCategories)
	mux.HandleFunc("/learn", handleAddCategory)
	mux.HandleFunc("/forget", handleRemoveCategory)
	mux.HandleFunc("/access", handleAccessReview)
	mux.HandleFunc("/clear", handleClearHistory)
	mux.Handle("/", http.FileServer(http.Dir(sd)))

	return mux
}
