'use strict';

var _           = require('underscore');
var db_keywords = require('./keywords.json');
var db_data     = require('./data.json');


function innerProduct(values1, values2) {
    var result = 0;

    for (var feature in values1) {
        result += values1[feature] * (values2[feature] || 0.0);
    }

    return result;
}

function countData(searchParams, minScore) {
    var dataCount = 0;

    for (var i = 0, count = db_data.length; i < count; ++i) {
        var record = db_data[i];
        var score  = innerProduct(searchParams, record.rating);

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
        var score  = innerProduct(searchParams, record.rating);

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

function searchProjection(searchParams, minScore, feature, range, steps) {
    var testParams = _.clone(searchParams);
    var results    = [];

    searchStepper(range, steps, function(position) {
        testParams[feature] = position;
        results.push({
            sample: position,
            count:  countData(testParams, minScore)
        });
    });

    return results;
}

function searchBuildHints(searchParams, minScore, feature, range, steps) {
    var projection = searchProjection(
        searchParams,
        minScore,
        feature,
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
    return _.keys(db_keywords);
}

module.exports.execQuery = function(query) {
    var searchParams  = query.searchParams || db_keywords[query.keyword];
    var searchResults = findData(searchParams, query.minScore, query.maxResults);
    var graphColumns  = {};

    for (var feature in searchParams) {
        var searchHints = searchBuildHints(
            searchParams,
            query.minScore,
            feature,
            query.searchRange,
            query.hintSteps
        );

        graphColumns[feature] = {
            color: '#607080',
            value: searchParams[feature],
            hints: searchHints,
            steps: query.hintSteps
        }
    }

    return {
        columns: graphColumns,
        params:  searchParams,
        items:   searchResults
    };
}
