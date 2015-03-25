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
	_ "github.com/go-sql-driver/mysql"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

var db *sql.DB

func executeQuery(rw http.ResponseWriter, req *http.Request) {
	var request jsonQueryRequest
	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	var geo *geoContext
	if request.Geo != nil {
		geo = &geoContext{latitude: request.Geo.Latitude, longitude: request.Geo.Longitude}
	}

	context := queryContext{geo, request.Profile, request.WalkingDist}
	entries := getRecords(context)
	features := fixFeatures(request.Features)

	foundEntries := findRecords(entries, features, request.MinScore)

	response := jsonQueryResponse{Columns: make(map[string]jsonColumn)}
	for name, value := range features {
		column := jsonColumn{Value: value, Steps: request.HintSteps}

		hints := project(
			foundEntries,
			features,
			name,
			request.MinScore,
			queryBounds{min: request.Range.Min, max: request.Range.Max},
			request.HintSteps)

		for _, hint := range hints {
			jsonHint := jsonProjection{
				Sample: hint.sample,
				Stats:  jsonStats{Count: hint.stats.count, Compatibility: hint.stats.compatibility}}
			column.Hints = append(column.Hints, jsonHint)
		}

		response.Columns[name] = column
	}

	for index, value := range foundEntries {
		if index > request.MaxResults {
			break
		}

		jsonEntry := jsonRecord{
			Name:           value.name,
			Score:          value.score,
			DistanceToUser: value.distanceToUser,
			DistanceToStn:  value.distanceToStn,
			ClosestStn:     value.closestStn,
			AccessCount:    value.accessCount,
			Id:             value.id}

		response.Items = append(response.Items, jsonEntry)
	}

	js, err := json.Marshal(response)
	if err != nil {
		log.Fatal(err)
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func getCategories(rw http.ResponseWriter, req *http.Request) {
	rows, err := db.Query("SELECT description, id FROM categories")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var categories []jsonCategory
	for rows.Next() {
		var (
			description string
			id          int
		)

		if err := rows.Scan(&description, &id); err != nil {
			log.Fatal(err)
		}

		categories = append(categories, jsonCategory{description, id})
	}

	if err := rows.Err(); err != nil {
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

	result, err := db.Exec("DELETE FROM categories WHERE id = (?)", request.Id)
	if err != nil {
		log.Fatal(err)
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		log.Fatal(err)
	}

	js, err := json.Marshal(jsonRemoveCategoryResponse{affectedRows > 0})
	if err != nil {
		log.Fatal(err)
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func accessReview(rw http.ResponseWriter, req *http.Request) {
	// function accessReview(query, callback) {
	//     query.profile = fixupProfile(query.profile);

	//     pool.query('SELECT url FROM reviews WHERE id = (?) LIMIT 1', [query.id], function(err, rows) {
	//         if (err) {
	//             throw err;
	//         }

	//         var results = {
	//             success: rows.length > 0
	//         };

	//         if (results.success) {
	//             results.url = 'http://www.tripadvisor.com' + rows[0].url;

	//             pool.query('UPDATE reviews SET accessCount = accessCount + 1 WHERE id = (?)', [query.id], function(err, info) {
	//                 if (_.keys(query.profile).length > 0) {
	//                     pool.query('INSERT INTO history(date, reviewId) VALUES(NOW(), ?)', [query.id], function(err, info) {
	//                         if (err) {
	//                             throw err;
	//                         }

	//                         for (var categoryId in query.profile) {
	//                             pool.query(
	//                                 'INSERT INTO historyGroups(categoryId, categoryValue, historyId) VALUES(?, ?, ?)',
	//                                 [categoryId, query.profile[categoryId], info.insertId]
	//                             );
	//                         }
	//                     });
	//                 }
	//             });
	//         }

	//         callback(results);
	//     });
	// }
}

func staticPath() (string, error) {
	if len(os.Args) > 1 {
		return os.Args[1], nil
	}

	return filepath.Abs(filepath.Join(filepath.Dir(os.Args[0]), "static"))
}

func main() {
	dir, err := staticPath()
	if err != nil {
		log.Fatal(err)
	}

	db, err = sql.Open("mysql", "hscd@/hscd")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	http.HandleFunc("/query", executeQuery)
	http.HandleFunc("/categories", getCategories)
	http.HandleFunc("/learn", addCategory)
	http.HandleFunc("/forget", removeCategory)
	http.HandleFunc("/access", accessReview)
	http.Handle("/", http.FileServer(http.Dir(dir)))

	log.Fatal(http.ListenAndServe(":3000", nil))
}
