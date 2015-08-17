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

import "log"

type scrapeTask struct {
	url string
	scr scraper
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

	t := tabelog{}

	tasks := []scrapeTask{
		{"http://tabelog.com/en/kanagawa/rstLst/1/", t},
	}

	out := make(chan restaurant)

	for _, task := range tasks {
		scrape(task.url, out, wc, gc, task.scr)
	}

	for {
		if _, ok := <-out; !ok {
			return
		}
	}
}
