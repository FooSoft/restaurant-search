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
	"errors"
	"log"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"text/template"

	"github.com/PuerkitoBio/goquery"
)

const (
	tabelogTemplate = "http://tabelog.com/en/rstLst/{{.Page}}/?lat=35.465808055555996&lon=139.61964361111&zoom=16&RdoCosTp=2&LstCos=0&LstCosT=11&LstSitu=0&LstRev=0&LstReserve=0&ChkParking=0&LstSmoking=0"
)

type tabelogParams struct {
	Page int
}

type tabelogReview struct {
	name       string
	address    string
	dishes     float64
	service    float64
	atmosphere float64
	cost       float64
	drinks     float64
	url        string
}

func parseCounts(doc *goquery.Document) (from, to, total int64, err error) {
	t := doc.Find("#js-item-count-downside").Text()

	r := regexp.MustCompile(`(\d+)\D*(\d+)\D*(\d+)`)
	if c := r.FindStringSubmatch(t); c != nil {
		from, _ = strconv.ParseInt(c[1], 10, 8)
		to, _ = strconv.ParseInt(c[2], 10, 8)
		total, _ = strconv.ParseInt(c[3], 10, 8)
	} else {
		err = errors.New("failed to parse counts")
	}

	return
}

func scrapeReview(url string, out chan tabelogReview) {
	doc, err := goquery.NewDocument(url)
	if err != nil {
		log.Print(err)
		return
	}

	var r tabelogReview

	r.url = url
	r.name = doc.Find("body > article > header > div.rd-header.l-container > div > div.rd-header__headline > h2 > a").Text()
	r.address = strings.TrimSpace(doc.Find("#anchor-rd-detail > section > table > tbody > tr > td > p.rd-detail-info__rst-address").First().Text())

	if r.dishes, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(2)").Text(), 8); err != nil {
		return
	}
	if r.service, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(4)").Text(), 8); err != nil {
		return
	}
	if r.atmosphere, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(6)").Text(), 8); err != nil {
		return
	}
	if r.cost, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(8)").Text(), 8); err != nil {
		return
	}
	if r.drinks, err = strconv.ParseFloat(doc.Find("#js-rating-detail > dd:nth-child(10)").Text(), 8); err != nil {
		return
	}

	out <- r
}

func scrapeIndex(url string, out chan tabelogReview) error {
	doc, err := goquery.NewDocument(url)
	if err != nil {
		return err
	}

	doc.Find("#js-map-search-result-list > li > div.list-rst__header > p > a").Each(func(index int, sel *goquery.Selection) {
		if href, ok := sel.Attr("href"); ok {
			go scrapeReview(href, out)
		}
	})

	return nil
}

func dumpReviews(c chan tabelogReview, cond *sync.Cond) {
	for {
		review, ok := <-c
		if !ok {
			break
		}

		log.Print(review)
	}

	cond.Signal()
}

func scrapeTabelog() error {
	var cond sync.Cond
	out := make(chan tabelogReview)
	go dumpReviews(out, &cond)

	t := template.New("tabelog")
	t.Parse(tabelogTemplate)

	for i := 1; i <= 60; i++ {
		var url bytes.Buffer
		if err := t.Execute(&url, tabelogParams{i}); err != nil {
			log.Fatal(err)
		}

		if err := scrapeIndex(string(url.Bytes()), out); err != nil {
			return err
		}
	}

	close(out)
	cond.Wait()

	return nil
}
