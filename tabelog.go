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
	"encoding/json"
	"io/ioutil"
	"log"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/PuerkitoBio/goquery"
)

type tabelogParams struct {
	Page int
}

type tabelogReview struct {
	Name    string
	Address string
	Url     string

	Dishes     float64
	Service    float64
	Atmosphere float64
	Cost       float64
	Drinks     float64

	Latitude  float64
	Longitude float64
}

func makeAbsUrl(base, ref string) string {
	b, err := url.Parse(base)
	if err != nil {
		log.Fatal(err)
	}

	r, err := url.Parse(ref)
	if err != nil {
		log.Fatal(err)
	}

	return b.ResolveReference(r).String()
}

func dumpReviews(filename string, in chan tabelogReview, wg *sync.WaitGroup) {
	defer wg.Done()

	var reviews []tabelogReview
	for {
		if review, ok := <-in; ok {
			reviews = append(reviews, review)
		} else {
			break
		}
	}

	js, err := json.MarshalIndent(reviews, "", "    ")
	if err != nil {
		log.Fatal(err)
	}

	if err := ioutil.WriteFile(filename, js, 0644); err != nil {
		log.Fatal(err)
	}
}

func decodeReviews(in chan tabelogReview, out chan tabelogReview, wg *sync.WaitGroup, gc *geoCache) {
	defer wg.Done()

	for {
		if review, ok := <-in; ok {
			log.Print("decoding %s", review.Name)

			coord, err := gc.decode(review.Address)
			if err != nil {
				log.Fatal(err)
			}

			review.Latitude = coord.Latitude
			review.Longitude = coord.Longitude

			out <- review
		} else {
			close(out)
		}
	}
}

func scrapeReview(url string, out chan tabelogReview, wg *sync.WaitGroup, wc *webCache) {
	defer wg.Done()

	doc, err := wc.load(url)
	if err != nil {
		log.Fatal(err)
	}

	addresses := doc.Find("p.rd-detail-info__rst-address")
	if addresses.Length() != 2 {
		return
	}

	var review tabelogReview

	review.Url = url
	review.Name = doc.Find("a.rd-header__rst-name-main").Text()
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

func scrapeIndex(url string, out chan tabelogReview, wc *webCache) {
	doc, err := wc.load(url)
	if err != nil {
		log.Fatal(err)
	}

	var wg sync.WaitGroup
	doc.Find("div.list-rst__header > p > a").Each(func(index int, sel *goquery.Selection) {
		if href, ok := sel.Attr("href"); ok {
			wg.Add(1)
			go scrapeReview(makeAbsUrl(url, href), out, &wg, wc)
		}
	})
	wg.Wait()

	if href, ok := doc.Find("a.c-pagination__target--next").Attr("href"); ok {
		scrapeIndex(makeAbsUrl(url, href), out, wc)
	}
}

func scrapeTabelog(url, resultFile, webCacheDir, geoCacheFile string) {
	wc, err := newWebCache(webCacheDir)
	if err != nil {
		log.Fatal(err)
	}

	gc, err := newGeoCache(geoCacheFile)
	if err != nil {
		log.Fatal(err)
	}

	scrapeChan := make(chan tabelogReview)
	decodeChan := make(chan tabelogReview)

	var wg sync.WaitGroup
	wg.Add(2)
	go decodeReviews(scrapeChan, decodeChan, &wg, gc)
	go dumpReviews(resultFile, decodeChan, &wg)

	scrapeIndex(url, scrapeChan, wc)
	close(scrapeChan)

	if err := gc.save(); err != nil {
		log.Fatal(err)
	}

	wg.Wait()
}
