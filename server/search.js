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

'use strict';

var _      = require('underscore');
var geolib = require('geolib');
var mysql  = require('mysql');
var pool   = null;


function innerProduct(values1, values2) {
    var result = 0.0;

    for (var feature in values1) {
        if (feature in values2) {
            result += values1[feature] * values2[feature];
        }
    }

    return result;
}

function walkMatches(data, features, minScore, callback) {
    for (var i = 0, count = data.length; i < count; ++i) {
        var record = data[i];
        var score  = innerProduct(features, record.features);

        if (score >= minScore) {
            callback(record, score);
        }
    }
}

function countRecords(data, features, minScore) {
    var count = 0;
    walkMatches(data, features, minScore, function(record, score) {
        ++count;
    });

    return count;
}

function findRecords(data, features, minScore) {
    var results = [];

    walkMatches(data, features, minScore, function(record, score) {
        results.push({
            name:           record.name,
            url:            'http://www.tripadvisor.com' + record.relativeUrl,
            score:          score,
            distanceToUser: record.distanceToUser / 1000.0,
            distanceToStn:  record.distanceToStn / 1000.0,
            closestStn:     record.closestStn,
            id:             record.id
        });
    });

    results.sort(function(a, b) {
        return b.score - a.score;
    });

    return results;
}

function step(range, steps, callback) {
    var stepSize = (range.max - range.min) / steps;

    for (var i = 0; i < steps; ++i) {
        var stepMax = range.max - stepSize * i;
        var stepMin = stepMax - stepSize;
        var stepMid = (stepMin + stepMax) / 2;

        callback(stepMid);
    }
}

function project(data, features, feature, minScore, range, steps) {
    var sample  = _.clone(features);
    var results = [];

    step(range, steps, function(position) {
        sample[feature] = position;
        results.push({
            sample: position,
            count:  countRecords(data, sample, minScore)
        });
    });

    return results;
}

function buildHints(data, features, feature, minScore, range, steps) {
    var projection = project(
        data,
        features,
        feature,
        minScore,
        range,
        steps
    );

    var hints = [];
    _.each(projection, function(result) {
        hints.push({
            sample: result.sample,
            count:  result.count
        });
    });

    return hints;
}

function loadDb(params) {
    pool = mysql.createPool(params);
}

function getRecords(context, callback) {
    pool.query('SELECT * FROM reviews', function(err, rows) {
        if (err) {
            throw err;
        }

        var records = _.map(rows, function(row) {
            return {
                name:          row.name,
                id:            row.id,
                relativeUrl:   row.url,
                closestStn:    row.closestStn,
                distanceToStn: row.distanceToStn,
                geo: {
                    latitude:    row.latitude,
                    longitude:   row.longitude
                },
                features: {
                    delicious:    row.delicious,
                    accomodating: row.accomodating,
                    affordable:   row.affordable,
                    atmospheric:  row.atmospheric
                },
            };
        });

        computeRecordGeo(records, context);
        callback(records);
    });
}

function computeRecordGeo(records, context) {
    var distUserMin = Number.MAX_VALUE;
    var distUserMax = Number.MIN_VALUE;

    _.each(records, function(record) {
        record.distanceToUser = 0.0;
        if (context.geo) {
            record.distanceToUser = geolib.getDistance(record.geo, context.geo);
        }

        distUserMin = Math.min(distUserMin, record.distanceToUser);
        distUserMax = Math.max(distUserMax, record.distanceToUser);
    });

    var distUserRange = distUserMax - distUserMin;

    _.each(records, function(record) {
        record.features.nearby = -((record.distanceToUser - distUserMin) / distUserRange - 0.5) * 2.0;

        record.features.accessible = 1.0 - (record.distanceToStn / context.walkingDist);
        record.features.accessible = Math.min(record.features.accessible, 1.0);
        record.features.accessible = Math.max(record.features.accessible, -1.0);
    });
}

function sanitizeQuery(query) {
    var keys = [
        'delicious',
        'accomodating',
        'affordable',
        'atmospheric',
        'nearby',
        'accessible'
    ];

    var features = {};
    _.each(keys, function(key) {
        features[key] = _.has(query.features, key) ? query.features[key] : 0.0;
    });

    query.features = features;
}

function execQuery(query, callback) {
    sanitizeQuery(query);

    var context = {
        geo:         query.geo,
        walkingDist: query.walkingDist * 1000.0
    };

    getRecords(context, function(data) {
        var searchResults = findRecords(
            data,
            query.features,
            query.minScore
        );

        var graphColumns = {};
        for (var feature in query.features) {
            var searchHints = buildHints(
                data,
                query.features,
                feature,
                query.minScore,
                query.range,
                query.hintSteps
            );

            graphColumns[feature] = {
                value: query.features[feature],
                hints: searchHints,
                steps: query.hintSteps
            };
        }

        callback({
            columns: graphColumns,
            items:   searchResults.slice(0, query.maxResults),
            count:   searchResults.length
        });
    });
}

module.exports = {
    loadDb:        loadDb,
    execQuery:     execQuery
};
