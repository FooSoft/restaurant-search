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
}

func (tripadvisor) index(doc *goquery.Document) (string, []string) {
	var reviewUrls []string
	doc.Find("a.property_title").Each(func(index int, sel *goquery.Selection) {
		if href, ok := sel.Attr("href"); ok {
			reviewUrls = append(reviewUrls, href)
		}
	})

	var nextIndexUrl string
	if href, ok := doc.Find("#EATERY_LIST_CONTENTS > div.deckTools.btm > div > a").Attr("href"); ok {
		nextIndexUrl = href
	}

	return nextIndexUrl, reviewUrls
}

func (tripadvisor) review(doc *goquery.Document) (name, address string, features map[string]float64, err error) {
	name = strings.TrimSpace(doc.Find("h1#HEADING").Text())
	address = strings.TrimSpace(doc.Find("address span.format_address").Text())

	ratings := doc.Find("ul.barChart div.ratingRow img.sprite-rating_s_fill")
	if ratings.Length() != 4 {
		err = errors.New("missing rating data")
		return
	}

	features = make(map[string]float64)
	for index, category := range []string{"food", "service", "value", "atmosphere"} {
		alt, _ := ratings.Eq(index).Attr("alt")
		rating := strings.Split(alt, " ")[0]
		if features[category], err = strconv.ParseFloat(rating, 8); err != nil {
			err = fmt.Errorf("invalid value for %s", category)
			return
		}
	}

	return
}
