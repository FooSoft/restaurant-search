'use strict';

var _          = require('underscore');
var keywords   = require('./keywords.json');
var data       = require('./data.json');

function innerProduct(values1, values2) {
    var result = 0;
    for (var feature in values1) {
        result += values1[feature] * (values2[feature] || 0.0);
    }

    return result;
}

function searchData(queryParams, minScore) {
    var results = [];

    for (var i = 0, count = DATA_RECORDS.length; i < count; ++i) {
        var record = DATA_RECORDS[i];
        var score  = innerProduct(queryParams, record['rating']);

        if (score >= minScore) {
            results.push({
               name:  record['name'],
               url:   'http://www.tripadvisor.com' + record['relativeUrl'],
               score: score
            });
        }
    }

    results.sort(function(a, b) {
        return b.score - a.score;
    });

    return results;
}

function searchStepper(range, steps, callback) {
    var stepSize = range.getLength() / steps;

    for (var i = 0; i < steps; ++i) {
        var stepMax = range.end - stepSize * i;
        var stepMin = stepMax - stepSize;
        var stepMid = (stepMin + stepMax) / 2;

        callback(stepMid);
    }
}

function searchProjection(queryParams, minScore, feature, range, steps) {
    var testParams = _.clone(queryParams);
    var results    = [];

    searchStepper(range, steps, function(position) {
        testParams[feature] = position;
        results.push({
            'sample': position,
            'values': searchData(testParams, minScore)
        });
    });

    return results;
}

function searchProjection2d(queryParams, minScore, feature1, feature2, range, steps) {
    var testParams = _.clone(queryParams);
    var results    = [];

    searchStepper(range, steps, function(sampleX) {
        testParams[feature1] = sampleX;
        searchStepper(range, steps, function(sampleY) {
            testParams[feature2] = sampleY;
            results.push({
                'sampleX': sampleX,
                'sampleY': sampleY,
                'values':  searchData(testParams, minScore)
            });
        });
    });

    return results;
}

function searchBuildHints(queryParams, minScore, feature, range, steps) {
    var projection = searchProjection(
        queryParams,
        minScore,
        feature,
        range,
        steps
    );

    var hints = [];
    _.each(projection, function(result) {
        hints.push({
            'sample': result.sample,
            'count':  result.values.length
        });
    });

    return hints;
}

function searchBuildHints2d(queryParams, minScore, feature1, feature2, range, steps) {
    var projection = searchProjection2d(
        queryParams,
        minScore,
        feature1,
        feature2,
        range,
        steps
    );

    var hints = [];
    _.each(projection, function(result) {
        hints.push({
            'sampleX': result.sampleX,
            'sampleY': result.sampleY,
            'count':   result.values.length
        });
    });

    return hints;
}

module.exports.getKeywords = function() {
    return _.keys(keywords);
}

module.exports.execQuery = function() {
    return {};
}
