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
	"encoding/json"
	"io/ioutil"
	"log"
	"strconv"
	"strings"
	"sync"
	"text/template"

	"github.com/PuerkitoBio/goquery"
)

const ()

type tabelogParams struct {
	Page int
}

type tabelogReview struct {
	Name       string
	Address    string
	Dishes     float64
	Service    float64
	Atmosphere float64
	Cost       float64
	Drinks     float64
	Url        string
}

func dumpReviews(filename string, in chan tabelogReview, out chan error) {
	count := 1

	var reviews []tabelogReview
	for {
		if review, ok := <-in; ok {
			log.Printf("%d\t%s", count, review.Name)
			reviews = append(reviews, review)
			count++
		} else {
			break
		}
	}

	js, err := json.MarshalIndent(reviews, "", "    ")
	if err != nil {
		out <- err
		return
	}

	out <- ioutil.WriteFile(filename, js, 0644)
}

func scrapeReview(url string, out chan tabelogReview, wg *sync.WaitGroup) {
	defer wg.Done()

	doc, err := goquery.NewDocument(url)
	if err != nil {
		return
	}

	addresses := doc.Find("p.rd-detail-info__rst-address")
	if addresses.Length() != 2 {
		return
	}

	var review tabelogReview

	review.Url = url
	review.Name = doc.Find("div.rd-header__headline > h2 > a").Text()
	review.Address = strings.TrimSpace(addresses.First().Text())

	if review.Dishes, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(2)").Text(), 8); err != nil {
		return
	}
	if review.Service, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(4)").Text(), 8); err != nil {
		return
	}
	if review.Atmosphere, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(6)").Text(), 8); err != nil {
		return
	}
	if review.Cost, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(8)").Text(), 8); err != nil {
		return
	}
	if review.Drinks, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(10)").Text(), 8); err != nil {
		return
	}

	out <- review
}

func scrapeIndex(url string, out chan tabelogReview) error {
	doc, err := goquery.NewDocument(url)
	if err != nil {
		return err
	}

	var wg sync.WaitGroup
	doc.Find("div.list-rst__header > p > a").Each(func(index int, sel *goquery.Selection) {
		if href, ok := sel.Attr("href"); ok {
			wg.Add(1)
			go scrapeReview(href, out, &wg)
		}
	})

	wg.Wait()
	return nil
}

func scrapeTabelog(filename, url string) error {
	out := make(chan tabelogReview)
	in := make(chan error)
	go dumpReviews(filename, out, in)

	t := template.New("tabelog")
	t.Parse(url)

	for i := 1; i <= 2; i++ {
		var url bytes.Buffer
		if err := t.Execute(&url, tabelogParams{i}); err != nil {
			return err
		}

		if err := scrapeIndex(string(url.Bytes()), out); err != nil {
			return err
		}
	}

	close(out)
	return <-in
}
