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
	"bufio"
	"errors"
	"log"
	"net/url"
	"os"
)

func scrapeUrls(filename string, wc *webCache, gc *geoCache) ([]restaurant, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var results []restaurant
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if line := scanner.Text(); len(line) > 0 {
			parsed, err := url.Parse(line)
			if err != nil {
				return nil, err
			}

			var items []restaurant
			switch parsed.Host {
			case "tabelog.com":
				items = scrape(line, wc, gc, tabelog{})
			case "www.tripadvisor.com":
				items = scrape(line, wc, gc, tripadvisor{})
			default:
				return nil, errors.New("unsupported review site")
			}

			results = append(results, items...)
		}
	}

	return results, nil
}

func main() {
	gc, err := newGeoCache("cache/geocache.json")
	if err != nil {
		log.Fatal(err)
	}
	defer gc.save()

	wc, err := newWebCache("cache/webcache")
	if err != nil {
		log.Fatal(err)
	}

	restaurants, err := scrapeUrls("urls.txt", wc, gc)
	if err == nil {
		log.Print(len(restaurants))
	} else {
		log.Fatal(err)
	}
}
