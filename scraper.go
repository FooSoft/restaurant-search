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
	"log"
	"net/url"
	"sync"

	"github.com/PuerkitoBio/goquery"
)

type restaurant struct {
	name    string
	address string
	url     string

	features map[string]float64

	latitude  float64
	longitude float64
}

type scraper interface {
	index(doc *goquery.Document) (string, []string)
	review(doc *goquery.Document) (string, string, map[string]float64, error)
}

func makeAbsUrl(ref, base string) (string, error) {
	b, err := url.Parse(base)
	if err != nil {
		return "", err
	}

	r, err := url.Parse(ref)
	if err != nil {
		return "", err
	}

	return b.ResolveReference(r).String(), nil
}

func decodeReviews(in chan restaurant, out chan restaurant, gc *geoCache) {
	for {
		if res, ok := <-in; ok {
			pos, err := gc.decode(res.address)
			if err == nil {
				res.latitude = pos.Latitude
				res.longitude = pos.Longitude
				out <- res
			} else {
				log.Printf("failed to decode address for %s (%v)", res.url, err)
			}
		} else {
			close(out)
			return
		}
	}
}

func scrapeReview(url string, out chan restaurant, wc *webCache, group *sync.WaitGroup, scr scraper) {
	defer group.Done()

	doc, err := wc.load(url)
	if err != nil {
		log.Printf("failed to load review at %s (%v)", url, err)
		return
	}

	name, address, features, err := scr.review(doc)
	if err != nil {
		log.Printf("failed to scrape review at %s (%v)", url, err)
		return
	}

	out <- restaurant{
		name:     name,
		address:  address,
		features: features,
		url:      url}
}

func scrapeIndex(indexUrl string, out chan restaurant, wc *webCache, scr scraper) {
	doc, err := wc.load(indexUrl)
	if err != nil {
		log.Printf("failed to load index at %s (%v)", indexUrl, err)
		return
	}

	nextIndexUrl, reviewUrls := scr.index(doc)
	if err != nil {
		log.Fatal(err)
	}

	var group sync.WaitGroup
	for _, reviewUrl := range reviewUrls {
		absUrl, err := makeAbsUrl(reviewUrl, indexUrl)
		if err != nil {
			log.Fatal(err)
		}

		group.Add(1)
		go scrapeReview(absUrl, out, wc, &group, scr)
	}
	group.Wait()

	if nextIndexUrl == "" {
		close(out)
	} else {
		absUrl, err := makeAbsUrl(nextIndexUrl, indexUrl)
		if err != nil {
			log.Fatal(err)
		}

		scrapeIndex(absUrl, out, wc, scr)
	}
}

func scrape(url string, wc *webCache, gc *geoCache, scr scraper) []restaurant {
	out := make(chan restaurant)
	in := make(chan restaurant)

	go scrapeIndex(url, in, wc, scr)
	go decodeReviews(in, out, gc)

	var results []restaurant
	for {
		if res, ok := <-out; ok {
			results = append(results, res)
		} else {
			return results
		}
	}
}
