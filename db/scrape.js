#!/usr/bin/env node

/*
 * Copyright (c) 2015 Alex Yatskov <alex@foosoft.net>
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

var cheerio    = require('cheerio');
var request    = require('request');
var underscore = require('underscore');
var url        = require('url');
var path       = require('path');
var fs         = require('fs');
var _          = require('underscore');


function requestCached(relativeUrl, callback) {
    var absoluteUrl = url.resolve('http://www.tripadvisor.com', relativeUrl);
    var cachePath   = path.join('cache', relativeUrl);

    fs.readFile(cachePath, function(err, data) {
        if (err) {
            var stream = fs.createWriteStream(cachePath);
            request(absoluteUrl, callback).pipe(stream);
        }
        else {
            callback(null, null, data);
        }
    });
}

function getBarPercent(bar) {
    return parseFloat(bar.attr('alt')) / 5.0;
}

function reviewScraped(err, resp, html) {
    if (err) {
        return console.error('Error: %s', err);
    }

    var $ = cheerio.load(html);

    var address = $('address span.format_address').text().trim();
    if (!address) {
        console.warn('Warning: review skipped, no address');
        return;
    }

    var storeName = $('h1#HEADING').text().trim();
    if (storeName.indexOf('CLOSED') !== -1) {
        console.warn('Warning: review skipped, closed');
        return;
    }

    var rating = $('ul.barChart img.rating_s_fill');
    if (rating.length != 4) {
        console.warn('Warning: review skipped, no summary');
        return;
    }

    var rateFood       = getBarPercent($(rating[0]));
    var rateService    = getBarPercent($(rating[1]));
    var rateValue      = getBarPercent($(rating[2]));
    var rateAtmosphere = getBarPercent($(rating[3]));

    if (rateFood === 0.0 && rateService === 0.0 && rateValue === 0.0 && rateAtmosphere === 0.0) {
        console.warn('Warning: review skipped, empty review');
        return;
    }

    var data = {
        name:        storeName,
        relativeUrl: this.relativeUrl,
        address:     address,
        rating: {
            food:       (rateFood - 0.5) * 2.0,
            service:    (rateService - 0.5) * 2.0,
            value:      (rateValue - 0.5) * 2.0,
            atmosphere: (rateAtmosphere - 0.5) * 2.0
        }
    };

    this.callback(data);
}

function scrapeReview(relativeUrl, callback) {
    console.log('Scraping review %s...', relativeUrl);

    var c = _.bind(reviewScraped, {
        callback:    callback,
        relativeUrl: relativeUrl
    });
    requestCached(relativeUrl, c);
}

function indexScraped(err, resp, html) {
    if (err) {
        return console.error('Error: %s', err);
    }

    var $     = cheerio.load(html);
    var that  = this;
    var abort = false;

    $('a.property_title').each(function(index, element) {
        if (abort) {
            return;
        }

        var reviewUrl = $(element).attr('href');
        if (that.callback(reviewUrl)) {
            abort = true;
        }
    });

    if (!abort) {
        var nextPageUrl = $('a.sprite-pageNext').attr('href');
        if (nextPageUrl) {
            scrapeIndices(nextPageUrl, this.callback);
        }
    }
}

function scrapeIndices(relativeUrl, callback) {
    console.log('Scraping index %s...', relativeUrl);

    var c = _.bind(indexScraped, { callback: callback });
    requestCached(relativeUrl, c);
}

function main() {
    var relativePaths = [
        '/Restaurants-g298173-Yokohama_Kanagawa_Prefecture_Kanto.html',
        '/Restaurants-g1021277-Fujisawa_Kanagawa_Prefecture_Kanto.html',
        '/Restaurants-g1021279-Chigasaki_Kanagawa_Prefecture_Kanto.html',
        '/Restaurants-g298172-Kawasaki_Kanagawa_Prefecture_Kanto.html',
        '/Restaurants-g1066854-Shinagawa_Tokyo_Tokyo_Prefecture_Kanto.html',
        '/Restaurants-g298184-Tokyo_Tokyo_Prefecture_Kanto.html'
    ];
    var databasePath = 'data.json';

    var abort = false;
    process.on('SIGINT', function() {
        console.warn('Caught SIGINT, aborting...');
        abort = true;
    });

    var results = [];
    _.each(relativePaths, function(relativePath) {
        scrapeIndices(relativePath, function(relativeUrl) {
            scrapeReview(relativeUrl, function(data) {
                results.push(data);
            });

            return abort;
        });
    });

    process.on('exit', function() {
        console.log('Total reviews scraped: %d', results.length);
        var strData = JSON.stringify(results, null, 4);
        fs.writeFileSync(databasePath, strData);
    });
}


if (require.main === module) {
    main();
}
