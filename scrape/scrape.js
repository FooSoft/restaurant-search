#!/usr/bin/env node

var cheerio = require('cheerio');
var request = require('request');
var url     = require('url');
var path    = require('path');
var fs      = require('fs');
var _       = require('underscore');


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
    var width = bar.css('width');
    return parseInt(width) / 91.0;
}

function reviewScraped(err, resp, html) {
    if (err) {
        return console.error('Error: %s', err);
    }

    var $ = cheerio.load(html);

    var bars = $('div.fill');
    if (bars.length != 9) {
        return;
    }

    var storeName = $('h1#HEADING').text().trim();
    if (storeName.indexOf('CLOSED') != -1) {
        return;
    }

    var rateFood       = getBarPercent($(bars[5]));
    var rateService    = getBarPercent($(bars[6]));
    var rateValue      = getBarPercent($(bars[7]));
    var rateAtmosphere = getBarPercent($(bars[8]));

    if (rateFood == 0.0 && rateService == 0.0 && rateValue == 0.0 && rateAtmosphere == 0.0) {
        return;
    }

    var data = {
        'name':        storeName,
        'relativeUrl': this.relativeUrl,
        'rating': {
            'food':       (rateFood - 0.5) * 2.0,
            'service':    (rateService - 0.5) * 2.0,
            'value':      (rateValue - 0.5) * 2.0,
            'atmosphere': (rateAtmosphere - 0.5) * 2.0
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
    var relativePath = '/Restaurants-g60763-New_York_City_New_York.html';
    var databasePath = 'data.json';

    var abort = false;
    process.on('SIGINT', function() {
        console.warn('Caught SIGINT, aborting...');
        abort = true;
    });

    var results = [];
    scrapeIndices(relativePath, function(relativeUrl) {
        scrapeReview(relativeUrl, function(data) {
            results.push(data);
        });

        return abort;
    });

    process.on('exit', function() {
        var strData = JSON.stringify(results, null, 4);
        fs.writeFileSync(databasePath, strData);
    });
}


if (require.main === module) {
    main();
}
