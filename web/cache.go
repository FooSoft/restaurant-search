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

package web

import (
	"bytes"
	"crypto/md5"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type Cache struct {
	directory string
	ticker    *time.Ticker
}

func NewCache(directory string) (*Cache, error) {
	if err := os.MkdirAll(directory, 0755); err != nil {
		return nil, err
	}

	cache := &Cache{
		directory: directory,
		ticker:    time.NewTicker(time.Millisecond * 100),
	}

	return cache, nil
}

func (c *Cache) urlToLocal(url string) string {
	hash := md5.New()
	hash.Write([]byte(url))
	return path.Join(c.directory, fmt.Sprintf("%x.html", hash.Sum(nil)))
}

func (c *Cache) Load(url string) (*goquery.Document, error) {
	localPath := c.urlToLocal(url)

	if file, err := os.Open(localPath); err == nil {
		defer file.Close()
		return goquery.NewDocumentFromReader(file)
	}

	<-c.ticker.C

	res, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var buff bytes.Buffer
	if _, err := buff.ReadFrom(res.Body); err != nil {
		return nil, err
	}

	if err := ioutil.WriteFile(localPath, buff.Bytes(), 0644); err != nil {
		return nil, err
	}

	return goquery.NewDocumentFromReader(&buff)
}
