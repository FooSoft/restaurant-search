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

type feature struct {
	value  float64
	weight float64
}

type review struct {
	name    string
	address string
	url     string

	features map[string]feature

	latitude  float64
	longitude float64

	scr scraper
	err error
}

type scraper interface {
	index(doc *goquery.Document) (string, []string)
	review(doc *goquery.Document) (string, string, map[string]feature, error)
	decode(address string) (float64, float64, error)
	load(url string) (*goquery.Document, error)
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

func decodeReviews(in chan review, out chan review, scr scraper) {
	for rev := range in {
		if rev.err == nil {
			rev.latitude, rev.longitude, rev.err = scr.decode(rev.address)
		}

		out <- rev
	}

	close(out)
}

func scrapeReview(url string, out chan review, scr scraper, group *sync.WaitGroup) {
	defer group.Done()

	var (
		doc *goquery.Document
		rev = review{url: url, scr: scr}
	)

	if doc, rev.err = scr.load(rev.url); rev.err == nil {
		rev.name, rev.address, rev.features, rev.err = scr.review(doc)
	}

	out <- rev
}

func scrapeIndex(indexUrl string, out chan review, scr scraper) error {
	var group sync.WaitGroup

	defer func() {
		group.Wait()
		close(out)
	}()

	for {
		doc, err := scr.load(indexUrl)
		if err != nil {
			return err
		}

		nextIndexUrl, reviewUrls := scr.index(doc)
		if err != nil {
			return err
		}

		for _, reviewUrl := range reviewUrls {
			absUrl, err := makeAbsUrl(reviewUrl, indexUrl)
			if err != nil {
				return err
			}

			group.Add(1)
			go scrapeReview(absUrl, out, scr, &group)
		}

		if err != nil {
			return err
		}

		if nextIndexUrl == "" {
			break
		}

		indexUrl, err = makeAbsUrl(nextIndexUrl, indexUrl)
		if err != nil {
			return err
		}
	}

	return nil
}

func scrape(url string, scr scraper) ([]review, error) {
	out := make(chan review, 128)
	in := make(chan review, 128)

	var (
		reviews []review
		wg      sync.WaitGroup
	)

	wg.Add(1)
	defer wg.Wait()

	go func() {
		defer wg.Done()
		for rev := range out {
			if rev.err == nil {
				log.Printf("SUCCESS: %s", rev.name)
				reviews = append(reviews, rev)
			} else {
				log.Printf("FAIL: %s", rev.name)
			}
		}
	}()

	go decodeReviews(in, out, scr)
	err := scrapeIndex(url, in, scr)

	return reviews, err
}
