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

var _        = require('underscore');
var geocoder = require('node-geocoder');
var geolib   = require('geolib');
var jf       = require('jsonfile');


function queryPosition(gc, address, cache, sequence, callback) {
    if (_.has(cache, address)) {
        console.log('Cache lookup success for:\n\t%s', address);
        callback(cache[address]);
        return sequence;
    }

    setTimeout(function() {
        gc.geocode(address, function(err, res) {
            if (err) {
                console.log('Geocode lookup fail for: \n\t%s', address);
                callback(null);
            }
            else {
                console.log('Geocode lookup success for: \n\t%s', address);
                callback(cache[address] = res[0]);
            }
        });
    }, sequence * 200);

    return sequence + 1;
}

function buildAccess(reviewData, stationData, accessibility) {
    _.each(reviewData, function(reviewItem) {
        var distMin = Number.MAX_VALUE;
        var station = '';

        console.log('Computing access for: \n\t%s', reviewItem.name);
        _.each(stationData, function(stationItem, stationName) {
            var distance = geolib.getDistance(reviewItem.geo, stationItem.geo);
            if (distance < distMin) {
                station = stationName;
                distMin = distance;
            }
        });

        reviewItem.distanceToStn = distMin;
        reviewItem.closestStn    = station;
    });
}

function main() {
    var gc       = geocoder.getGeocoder('google', 'http', {});
    var sequence = 0;

    var stationData    = jf.readFileSync('stations.json');
    var cacheData      = jf.readFileSync('cache/geo.json', {throws: false}) || {};
    var reviewData     = jf.readFileSync('data.json');
    var reviewCount    = reviewData.length;
    var reviewDataDest = [];

    _.each(reviewData, function(reviewItem) {
        sequence = queryPosition(gc, reviewItem.address, cacheData, sequence, function(geo) {
            if (geo) {
                var destItem = _.clone(reviewItem);
                destItem.geo = geo;
                reviewDataDest.push(destItem);
            }

            if (--reviewCount === 0) {
                buildAccess(reviewDataDest, stationData);

                jf.writeFileSync('data.json', reviewDataDest);
                jf.writeFileSync('cache/geo.json', cacheData);
            }
        });
    });
}

if (require.main === module) {
    main();
}
