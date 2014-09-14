'use strict';

var _           = require('underscore');
var db_keywords = require('./keywords.json');
var db_data     = require('./data.json');


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

function countData(searchParams, minScore) {
    var dataCount = 0;

    for (var i = 0, count = db_data.length; i < count; ++i) {
        var record = db_data[i];
        var score  = 0.0;

        for (var keyword in searchParams) {
            var features = scale(db_keywords[keyword], searchParams[keyword]);
            score += innerProduct(features, record.rating);
        }

        if (score >= minScore) {
            ++dataCount;
        }
    }

    return dataCount;
}

function findData(searchParams, minScore, maxResults) {
    var results = [];

    for (var i = 0, count = db_data.length; i < count; ++i) {
        var record = db_data[i];
        var score  = 0.0;

        for (var keyword in searchParams) {
            var features = scale(db_keywords[keyword], searchParams[keyword]);
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

    return results.slice(0, maxResults);
}

function searchStepper(range, steps, callback) {
    var stepSize = (range.max - range.min) / steps;

    for (var i = 0; i < steps; ++i) {
        var stepMax = range.max - stepSize * i;
        var stepMin = stepMax - stepSize;
        var stepMid = (stepMin + stepMax) / 2;

        callback(stepMid);
    }
}

function searchProjection(searchParams, minScore, keyword, range, steps) {
    var testParams = _.clone(searchParams);
    var results    = [];

    searchStepper(range, steps, function(position) {
        testParams[keyword] = position;
        results.push({
            sample: position,
            count:  countData(testParams, minScore)
        });
    });

    return results;
}

function searchBuildHints(searchParams, minScore, keyword, range, steps) {
    var projection = searchProjection(
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

module.exports.getKeywords = function() {
    return _.keys(db_keywords).sort();
}

module.exports.execQuery = function(query) {
    if (!query.searchParams) {
        query.searchParams = {};
        for (var i = 0, count = query.keywords.length; i < count; ++i) {
            var keyword = query.keywords[i];
            if (_.has(db_keywords, keyword)) {
                query.searchParams[keyword] = 1.0;
            }
        }
    }

    var searchResults = findData(
        query.searchParams,
        query.minScore,
        query.maxResults
    );

    var graphColumns = {};
    for (var keyword in query.searchParams) {
        var searchHints = searchBuildHints(
            query.searchParams,
            query.minScore,
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

    return {
        columns: graphColumns,
        params:  query.searchParams,
        items:   searchResults
    };
}
