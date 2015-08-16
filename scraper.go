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

type review struct {
	name    string
	address string
	url     string

	features map[string]float64

	latitude  float64
	longitude float64
}

type profiler interface {
	index(doc *goquery.Document) (string, []string)
	profile(doc *goquery.Document) *review
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

func decodeReviews(in chan review, out chan review, cache *geoCache) {
	for {
		if r, ok := <-in; ok {
			pos, err := cache.decode(r.address)
			if err == nil {
				r.latitude = pos.Latitude
				r.longitude = pos.Longitude
				out <- r
			} else {
				log.Printf("failed to decode address for %s (%v)", r.url, err)
			}
		} else {
			close(out)
			return
		}
	}
}

func scrapeReview(url string, out chan review, cache *webCache, group *sync.WaitGroup, prof profiler) {
	defer group.Done()

	doc, err := cache.load(url)
	if err != nil {
		log.Printf("failed to scrape review at %s (%v)", url, err)
	} else if r := prof.profile(doc); r != nil {
		r.url = url
		out <- *r
	}
}

func scrapeIndex(indexUrl string, out chan review, cache *webCache, prof profiler) {
	doc, err := cache.load(indexUrl)
	if err != nil {
		log.Printf("failed to scrape index at %s (%v)", indexUrl, err)
		return
	}

	nextIndexUrl, reviewUrls := prof.index(doc)
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
		go scrapeReview(absUrl, out, cache, &group, prof)
	}
	group.Wait()

	if nextIndexUrl == "" {
		close(out)
	} else {
		absUrl, err := makeAbsUrl(nextIndexUrl, indexUrl)
		if err != nil {
			log.Fatal(err)
		}

		scrapeIndex(absUrl, out, cache, prof)
	}
}

func scrape(url string, wc *webCache, gc *geoCache, prof profiler) []review {
	scrapeChan := make(chan review)
	decodeChan := make(chan review)

	go scrapeIndex(url, scrapeChan, wc, prof)
	go decodeReviews(scrapeChan, decodeChan, gc)

	var reviews []review
	for {
		if r, ok := <-decodeChan; ok {
			log.Print(r.name)
			reviews = append(reviews, r)
		} else {
			return reviews
		}
	}
}
