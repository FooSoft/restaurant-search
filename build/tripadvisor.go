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
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

type tripadvisor struct {
	scrapeCtx
}

func (tripadvisor) define(keyword string) semantics {
	return map[string]semantics{
		"food":       {accomodating: 0.0, affordable: 0.0, atmospheric: 0.0, delicious: 1.0},
		"service":    {accomodating: 1.0, affordable: 0.0, atmospheric: 0.0, delicious: 0.0},
		"value":      {accomodating: 0.0, affordable: 1.0, atmospheric: 0.0, delicious: 0.0},
		"atmosphere": {accomodating: 0.0, affordable: 0.0, atmospheric: 1.0, delicious: 0.0},
	}[keyword]
}

func (tripadvisor) index(doc *goquery.Document) (string, []string) {
	var reviewUrls []string
	doc.Find("a.property_title").Each(func(index int, sel *goquery.Selection) {
		if href, ok := sel.Attr("href"); ok {
			reviewUrls = append(reviewUrls, href)
		}
	})

	var nextIndexUrl string
	if href, ok := doc.Find("div.deckTools.btm a.nav.next.rndBtn.rndBtnGreen.taLnk").Attr("href"); ok {
		nextIndexUrl = href
	}

	return nextIndexUrl, reviewUrls
}

func (tripadvisor) review(doc *goquery.Document) (name, address string, features map[string]float64, weight float64, err error) {
	if name = strings.TrimSpace(doc.Find("h1#HEADING").Text()); len(name) == 0 {
		err = errors.New("invalid value for name name")
		return
	}

	if address = strings.TrimSpace(doc.Find("address span.format_address").Text()); len(address) == 0 {
		err = errors.New("invalid value for address")
		return
	}

	ratings := doc.Find("ul.barChart div.ratingRow img.sprite-rating_s_fill")
	if ratings.Length() != 4 {
		err = errors.New("missing rating data")
		return
	}

	features = make(map[string]float64)
	for index, category := range []string{"food", "service", "value", "atmosphere"} {
		altText, _ := ratings.Eq(index).Attr("alt")
		valueText := strings.Split(altText, " ")[0]

		var value float64
		if value, err = strconv.ParseFloat(valueText, 8); err != nil {
			err = fmt.Errorf("invalid value for %s", category)
			return
		}

		features[category] = value/2.5 - 1.0
	}

	weightParts := strings.Split(doc.Find("h3.reviews_header").Text(), " ")
	if len(weightParts) == 0 {
		err = fmt.Errorf("missing review count")
		return
	}

	if weight, err = strconv.ParseFloat(weightParts[0], 8); err != nil {
		err = fmt.Errorf("invalid value for review count")
		return
	}

	return
}
