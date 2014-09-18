'use strict';

var _           = require('underscore');
var mysql       = require('mysql');
var connection  = null;


function innerProduct(values1, values2) {
    var result = 0.0;

    for (var feature in values1) {
        result += values1[feature] * (values2[feature] || 0.0);
    }

    return result;
}

function scale(values, factor) {
    var result = {};

    for (var feature in values) {
        result[feature] = values[feature] * factor;
    }

    return result;
}

function normalize(values) {
    var result = {};

    for (var feature in values) {
        var value = values[feature];
        result[feature] = Math.max(-1.0, Math.min(1.0, value), value);
    }

    return result;
}

function combine(values1, values2) {
    var result = {};

    for (var feature in values1) {
        result[feature] = values1[feature] + (values2[feature] || 0.0);
    }

    return result;
}

function countRecords(data, searchParams, minScore) {
    var dataCount = 0;

    for (var i = 0, count = data.records.length; i < count; ++i) {
        var record = data.records[i];
        var score  = 0.0;

        for (var keyword in searchParams) {
            var features = scale(data.keywords[keyword], searchParams[keyword]);
            score += innerProduct(features, record.rating);
        }

        if (score >= minScore) {
            ++dataCount;
        }
    }

    return dataCount;
}

function findRecords(data, searchParams, minScore) {
    var results = [];

    for (var i = 0, count = data.records.length; i < count; ++i) {
        var record = data.records[i];
        var score  = 0.0;

        for (var keyword in searchParams) {
            var features = scale(data.keywords[keyword], searchParams[keyword]);
            score += innerProduct(features, record.rating);
        }

        if (score >= minScore) {
            results.push({
                name:  record.name,
                url:   'http://www.tripadvisor.com' + record.relativeUrl,
                score: score
            });
        }
    }

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

function project(data, searchParams, minScore, keyword, range, steps) {
    var testParams = _.clone(searchParams);
    var results    = [];

    step(range, steps, function(position) {
        testParams[keyword] = position;
        results.push({
            sample: position,
            count:  countRecords(data, testParams, minScore)
        });
    });

    return results;
}

function buildHints(data, searchParams, minScore, keyword, range, steps) {
    var projection = project(
        data,
        searchParams,
        minScore,
        keyword,
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
    connection = mysql.createConnection(params);
}

function addKeyword(query, callback) {
    if (!query.keyword) {
        callback({
            keyword: query.keyword,
            success: false
        });

        return;
    }

    getKeywords(function(keywords) {
        var result = {
            food:       0.0,
            service:    0.0,
            value:      0.0,
            atmosphere: 0.0
        };

        for (var param in query.params) {
            var features = scale(keywords[param], query.params[param]);
            result = combine(result, features);
        }

        result = normalize(result);

        var values = [
            query.keyword,
            result.food,
            result.service,
            result.value,
            result.atmosphere
        ];

        connection.query('INSERT INTO keywords VALUES(?, ?, ?, ?, ?)', values, function(err) {
            callback({
                keyword: query.keyword,
                success: err === null
            });
        });
    });
}

function removeKeyword(query, callback) {
    connection.query('DELETE FROM keywords WHERE name=?', [query.keyword], function(err) {
        callback({
            keyword: query.keyword,
            success: err === null
        });
    });
}

function getKeywords(callback) {
    connection.query('SELECT * FROM keywords', function(err, rows) {
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
    connection.query('SELECT * FROM reviews', function(err, rows) {
        if (err) {
            throw err;
        }

        var records = _.map(rows, function(row) {
            return {
                name:        row.name,
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

function execQuery(query, callback) {
    getData(function(data) {
        var searchResults = findRecords(
            data,
            query.searchParams,
            query.minScore * _.keys(query.searchParams).length
        );

        var graphColumns = {};
        for (var keyword in query.searchParams) {
            var searchHints = buildHints(
                data,
                query.searchParams,
                query.minScore * _.keys(query.searchParams).length,
                keyword,
                query.searchRange,
                query.hintSteps
            );

            graphColumns[keyword] = {
                color: '#607080',
                value: query.searchParams[keyword],
                hints: searchHints,
                steps: query.hintSteps
            }
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
    'getKeywords':   getKeywords,
    'execQuery':     execQuery
};
