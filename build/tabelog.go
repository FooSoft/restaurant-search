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

type tabelog struct {
	scrapeCtx
}

func (tabelog) index(doc *goquery.Document) (string, []string) {
	var reviewUrls []string
	doc.Find("div.list-rst__header > p > a").Each(func(index int, sel *goquery.Selection) {
		if href, ok := sel.Attr("href"); ok {
			reviewUrls = append(reviewUrls, href)
		}
	})

	var nextIndexUrl string
	if href, ok := doc.Find("a.c-pagination__target--next").Attr("href"); ok {
		nextIndexUrl = href
	}

	return nextIndexUrl, reviewUrls
}

func (tabelog) review(doc *goquery.Document) (name, address string, features map[string]feature, err error) {
	name = doc.Find("a.rd-header__rst-name-main").Text()

	if addresses := doc.Find("p.rd-detail-info__rst-address"); addresses.Length() == 2 {
		address = strings.TrimSpace(addresses.First().Text())
	} else {
		err = errors.New("invalid value for address")
		return
	}

	features = make(map[string]feature)

	for index, category := range []string{"dishes", "service", "atmosphere", "cost", "drinks"} {
		valueText := doc.Find(fmt.Sprintf("#js-rating-detail > dd:nth-child(%d)", (index+1)*2)).Text()

		var value float64
		if value, err = strconv.ParseFloat(valueText, 8); err != nil {
			err = fmt.Errorf("invalid value for %s", category)
			return
		}

		features[category] = feature{value/2.5 - 1.0, 1.0}
	}

	return
}
