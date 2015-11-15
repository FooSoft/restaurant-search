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
	"io/ioutil"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/naoina/toml"
)

//
// semantics
//
type semantics struct {
	Accommodating float64
	Affordable    float64
	Atmospheric   float64
	Delicious     float64
}

func (s semantics) combine(other semantics, weight float64) semantics {
	return semantics{
		s.Accommodating + other.Accommodating*weight,
		s.Affordable + other.Affordable*weight,
		s.Atmospheric + other.Atmospheric*weight,
		s.Delicious + other.Delicious*weight,
	}
}

func (s semantics) reduce(weight float64) semantics {
	return semantics{
		s.Accommodating / weight,
		s.Affordable / weight,
		s.Atmospheric / weight,
		s.Delicious / weight,
	}
}

//
// selector
//
type selector struct {
	Path  string
	Attr  string
	RegEx string

	regExComp *regexp.Regexp
}

func (l *selector) locateStrings(doc *goquery.Document) ([]string, error) {
	var err error
	if len(l.RegEx) > 0 && l.regExComp == nil {
		if l.regExComp, err = regexp.Compile(l.RegEx); err != nil {
			return nil, err
		}
	}

	var strs []string
	doc.Find(l.Path).Each(func(index int, sel *goquery.Selection) {
		var str string
		if len(l.Attr) > 0 {
			str, _ = sel.Attr(l.Attr)
		} else {
			str = sel.Text()
		}

		if l.regExComp != nil {
			if matches := l.regExComp.FindStringSubmatch(str); len(matches) > 1 {
				str = matches[1]
			} else {
				str = ""
			}
		}

		strs = append(strs, strings.TrimSpace(str))
	})

	return strs, err
}

func (l *selector) locateString(doc *goquery.Document) (string, error) {
	strs, err := l.locateStrings(doc)
	if err != nil {
		return "", err
	}

	return strings.Join(strs, " "), nil
}

func (l *selector) locateInt(doc *goquery.Document) (int64, error) {
	str, err := l.locateString(doc)
	if err != nil {
		return 0, err
	}

	return strconv.ParseInt(str, 10, 8)
}

func (l *selector) locateFloat(doc *goquery.Document) (float64, error) {
	str, err := l.locateString(doc)
	if err != nil {
		return 0.0, err
	}

	return strconv.ParseFloat(str, 8)
}

//
// converter
//
type converter struct {
	Name    string
	Domains []string

	Index struct {
		Items selector
		Next  selector
	}

	Item struct {
		Name    selector
		Address selector
		Count   selector
		Props   map[string]struct {
			semantics
			selector
			Scale float64
		}
	}
}

func newConverter(filename string) (*converter, error) {
	bytes, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var desc converter
	if err := toml.Unmarshal(bytes, &desc); err != nil {
		return nil, err
	}

	return &desc, nil
}

func (c converter) define(keyword string) semantics {
	return c.Item.Props[keyword].semantics
}

func (c converter) compatible(address string) bool {
	parsed, err := url.Parse(address)
	if err != nil {
		return false
	}

	for _, d := range c.Domains {
		if d == parsed.Host {
			return true
		}
	}

	return false
}

func (c converter) index(doc *goquery.Document) (next string, items []string, err error) {
	if items, err = c.Index.Items.locateStrings(doc); err != nil {
		return
	}

	if next, err = c.Index.Next.locateString(doc); err != nil {
		return
	}

	return
}

func (c converter) review(doc *goquery.Document) (name, address string, features map[string]float64, count int64, err error) {
	if name, err = c.Item.Name.locateString(doc); err != nil || len(name) == 0 {
		err = errors.New("invalid name")
		return
	}

	if address, err = c.Item.Address.locateString(doc); err != nil || len(address) == 0 {
		err = errors.New("invalid address")
		return
	}

	if count, err = c.Item.Count.locateInt(doc); err != nil {
		err = errors.New("invalid review count")
		return
	}

	features = make(map[string]float64)
	for n, p := range c.Item.Props {
		var value float64
		if value, err = p.locateFloat(doc); err != nil {
			err = fmt.Errorf("invalid feature value for %s", n)
			return
		}

		if p.Scale != 0.0 {
			value /= p.Scale
		}

		features[n] = value*2.0 - 1.0
	}

	return
}
