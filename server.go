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
	"os"
	// "encoding/json"
	"encoding/json"
	_ "github.com/go-sql-driver/mysql"
	"log"
	"net/http"
	"path/filepath"
)

var db *sql.DB

func executeQuery(rw http.ResponseWriter, req *http.Request) {

}

func getCategories(rw http.ResponseWriter, req *http.Request) {
	rows, err := db.Query("SELECT * FROM categories")
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Category struct {
		Description string `json:"description"`
		Id          int    `json:"id"`
	}

	var categories []Category
	for rows.Next() {
		var (
			description string
			id          int
		)

		if err := rows.Scan(&description, &id); err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		categories = append(categories, Category{description, id})
	}

	if err := rows.Err(); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	js, err := json.Marshal(categories)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func addCategory(rw http.ResponseWriter, req *http.Request) {

}

func removeCategory(rw http.ResponseWriter, req *http.Request) {
	type Request struct {
		Id int `json:"id"`
	}

	decoder := json.NewDecoder(req.Body)

	var request Request
	if err := decoder.Decode(&request); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	result, err := db.Exec("DELETE FROM categories WHERE id = (?)", request.Id)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	affected, err := result.RowsAffected()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	type Response struct {
		Success bool `json:"success"`
	}

	js, err := json.Marshal(Response{affected > 0})
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
}

func accessReview(rw http.ResponseWriter, req *http.Request) {

}

func getStaticPath() (string, error) {
	if len(os.Args) > 1 {
		return os.Args[1], nil
	}

	return filepath.Abs(filepath.Join(filepath.Dir(os.Args[0]), "static"))
}

func main() {
	dir, err := getStaticPath()
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
