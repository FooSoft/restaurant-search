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

func main() {
	urlFormat := "http://tabelog.com/en/rstLst/{{.Page}}/?lat=35.465808055555996&lon=139.61964361111&zoom=16&RdoCosTp=2&LstCos=0&LstCosT=11&LstSitu=0&LstRev=0&LstReserve=0&ChkParking=0&LstSmoking=0"
	tabelogReviews := "tabelog.json"

	if err := scrapeTabelog(tabelogReviews, urlFormat); err != nil {
		log.Fatal(err)
	}
}
