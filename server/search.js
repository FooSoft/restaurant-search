#!/usr/bin/env node

/*

   The MIT License (MIT)

   Copyright (c) 2014 Alex Yatskov

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.

*/

'use strict';

var _     = require('underscore');
var mysql = require('mysql');
var pool  = null;

function innerProduct(values1, values2) {
    var result = 0.0;

    for (var feature in values1) {
        result += values1[feature] * (values2[feature] || 0.0);
    }

    return result;
}

function walkMatches(data, features, minScore, callback) {
    for (var i = 0, count = data.records.length; i < count; ++i) {
        var record = data.records[i];
        var score  = innerProduct(features, record.rating);

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
            name:  record.name,
            url:   'http://www.tripadvisor.com' + record.relativeUrl,
            score: score,
            id:    record.id
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

function addKeyword(query, callback) {
    if (!/^[a-zA-Z0-9]+$/.test(query.keyword)) {
        callback({ keyword: query.keyword, success: false });
        return;
    }

    getKeywords(function(keywords) {
        var values = [
            query.keyword,
            query.features.food,
            query.features.service,
            query.features.value,
            query.features.atmosphere
        ];

        pool.query('INSERT INTO keywords VALUES(?, ?, ?, ?, ?)', values, function(err) {
            callback({ keyword: query.keyword, success: err === null });
        });
    });
}

function removeKeyword(query, callback) {
    pool.query('DELETE FROM keywords WHERE name=? AND name NOT IN (SELECT name FROM presets)', [query.keyword], function(err, fields) {
        callback({
            keyword: query.keyword,
            success: err === null && fields.affectedRows > 0
        });
    });
}

function getKeywords(callback) {
    pool.query('SELECT * FROM keywords', function(err, rows) {
        if (err) {
            throw err;
        }

        var keywords = {};
        for (var i = 0, count = rows.length; i < count; ++i) {
            var row = rows[i];
            keywords[row.name] = {
                food:       row.food,
                service:    row.service,
                value:      row.value,
                atmosphere: row.atmosphere
            };
        }

        callback(keywords);
    });
}

function getRecords(callback) {
    pool.query('SELECT * FROM reviews', function(err, rows) {
        if (err) {
            throw err;
        }

        var records = _.map(rows, function(row) {
            return {
                name:        row.name,
                id:          row.id,
                relativeUrl: row.url,
                rating:      {
                    food:       row.food,
                    service:    row.service,
                    value:      row.value,
                    atmosphere: row.atmosphere
                }
            };
        });

        callback(records);
    });
}

function getData(callback) {
    getKeywords(function(keywords) {
        getRecords(function(records) {
            callback({
                keywords: keywords,
                records:  records
            });
        });
    });
}

function getParameters(callback) {
    getKeywords(function(keywords) {
        callback({
            keywords: keywords,
            features: [ 'food', 'service', 'atmosphere', 'value' ]
        });
    });
}

function execQuery(query, callback) {
    getData(function(data) {
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
    'loadDb':        loadDb,
    'addKeyword':    addKeyword,
    'removeKeyword': removeKeyword,
    'getParameters': getParameters,
    'execQuery':     execQuery
};
