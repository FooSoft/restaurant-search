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
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/naoina/toml"
)

//
// descriptor
//
type descriptor struct {
	gc *geoCache
	wc *webCache

	conf descConf
}

//
// semantics
//
type semantics struct {
	Accomodating float64
	Affordable   float64
	Atmospheric  float64
	Delicious    float64
}

func (s semantics) combine(other semantics, weight float64) semantics {
	return semantics{
		s.Accomodating + other.Accomodating*weight,
		s.Affordable + other.Affordable*weight,
		s.Atmospheric + other.Atmospheric*weight,
		s.Delicious + other.Delicious*weight,
	}
}

func (s semantics) reduce(weight float64) semantics {
	return semantics{
		s.Accomodating / weight,
		s.Affordable / weight,
		s.Atmospheric / weight,
		s.Delicious / weight,
	}
}

//
// pathConf
//
type pathConf struct {
	Path  string
	Attr  string
	RegEx string

	regExComp *regexp.Regexp
}

func (c *pathConf) locateStrings(doc *goquery.Document) ([]string, error) {
	var err error
	if len(c.RegEx) > 0 && c.regExComp == nil {
		if c.regExComp, err = regexp.Compile(c.RegEx); err != nil {
			return nil, err
		}
	}

	var strs []string
	doc.Find(c.Path).Each(func(index int, sel *goquery.Selection) {
		var str string
		if len(c.Attr) > 0 {
			str, _ = sel.Attr(c.Attr)
		} else {
			str = sel.Text()
		}

		if c.regExComp != nil {
			if matches := c.regExComp.FindStringSubmatch(str); len(matches) > 1 {
				str = matches[1]
			} else {
				str = ""
			}
		}

		strs = append(strs, str)
	})

	return strs, err

}

func (c *pathConf) locateString(doc *goquery.Document) (string, error) {
	strs, err := c.locateStrings(doc)
	if err != nil {
		return "", err
	}

	return strings.Join(strs, " "), nil
}

func (c *pathConf) locateInt(doc *goquery.Document) (int64, error) {
	str, err := c.locateString(doc)
	if err != nil {
		return 0, err
	}

	return strconv.ParseInt(str, 10, 8)
}

func (c *pathConf) locateFloat(doc *goquery.Document) (float64, error) {
	str, err := c.locateString(doc)
	if err != nil {
		return 0.0, err
	}

	return strconv.ParseFloat(str, 8)
}

//
// semConf
//
type semConf struct {
	semantics
	pathConf

	Scale float64
}

//
// descConf
//
type descConf struct {
	Index struct {
		Items pathConf
		Next  pathConf
	}

	Item struct {
		Name    pathConf
		Address pathConf
		Count   pathConf
		Sem     map[string]semConf
	}
}

func newDescriptor(filename string, gc *geoCache, wc *webCache) (*descriptor, error) {
	desc := &descriptor{gc: gc, wc: wc}

	bytes, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	if err := toml.Unmarshal(bytes, &desc.conf); err != nil {
		return nil, err
	}

	return desc, nil
}

func (d descriptor) define(keyword string) semantics {
	return d.conf.Item.Sem[keyword].semantics
}

func (d descriptor) index(doc *goquery.Document) (next string, items []string, err error) {
	if items, err = d.conf.Index.Items.locateStrings(doc); err != nil {
		return
	}

	if next, err = d.conf.Index.Next.locateString(doc); err != nil {
		return
	}

	return
}

func (d descriptor) review(doc *goquery.Document) (name, address string, features map[string]float64, count int64, err error) {
	if name, err = d.conf.Item.Name.locateString(doc); err != nil || len(name) == 0 {
		err = errors.New("invalid name")
		return
	}

	if address, err = d.conf.Item.Address.locateString(doc); err != nil || len(address) == 0 {
		err = errors.New("invalid address")
		return
	}

	if count, err = d.conf.Item.Count.locateInt(doc); err != nil {
		err = errors.New("invalid review count")
		return
	}

	features = make(map[string]float64)
	for n, s := range d.conf.Item.Sem {
		var value float64
		if value, err = s.pathConf.locateFloat(doc); err != nil {
			err = fmt.Errorf("invalid feature value for %s", n)
			return
		}

		if s.Scale != 0.0 {
			value /= s.Scale
		}

		features[n] = value
	}

	return
}
