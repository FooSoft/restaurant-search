'use strict';

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

function outputResults(results, maxResults) {
    $('#results').empty();
    $('#count').text(results.length);

    results = results.splice(0, maxResults);

    var template = Handlebars.compile($('#template').html());
    $('#results').append(template({'results': results}));
}

function onAdjust(name, value) {
    var wa = window.adjuster;
    var wg = window.grapher;
    var wp = window.plotter;

    wa.queryParams[name] = value;
    console.log(wa.queryParams);

    var hintData = {};
    _.each(wg.getColumnNames(), function(name) {
        hintData[name] = searchBuildHints(wa.queryParams, wa.minScore, name, wa.searchRange, wa.hintSteps);
    });
    wg.setColumnHints(hintData);

    var plotterAxisX    = $('#plotAxisX').val();
    var plotterAxisY    = $('#plotAxisY').val();
    var plotterData     = searchBuildHints2d(wa.queryParams, wa.minScore, plotterAxisX, plotterAxisY, wa.searchRange, wa.hintSteps)
    var plotterPosition = new goog.math.Coordinate(wa.queryParams[plotterAxisX], wa.queryParams[plotterAxisY]);

    wp.setPosition(plotterPosition);
    wp.setData(plotterData);
    wp.updateShapes();

    var results = searchData(wa.queryParams, wa.minScore);
    outputResults(results, wa.maxResults);
}

function onQuery() {
    var query            = $('#query').val();
    var minScore         = parseInt($('#minScore').val()) || 1.0;
    var hintSteps        = parseInt($('#hintSteps').val()) || 20;
    var maxResults       = parseInt($('#maxResults').val()) || 100;
    var useLocalScale    = true;
    var useRelativeScale = true;

    console.assert(query in DATA_KEYWORDS);

    var queryParams  = DATA_KEYWORDS[query];
    var searchRange  = new goog.math.Range(-1.0, 1.0);
    var graphColumns = {};

    for (var feature in queryParams) {
        var hints = searchBuildHints(
            queryParams,
            minScore,
            feature,
            searchRange,
            hintSteps
        );

        graphColumns[feature] = {
            'color': '#607080',
            'value': queryParams[feature],
            'hints': hints,
            'steps': hintSteps
        }
    }

    window.adjuster = {
        queryParams: queryParams,
        searchRange: searchRange,
        hintSteps:   hintSteps,
        minScore:    minScore,
        maxResults:  maxResults
    };

    window.grapher = new Grapher('grapher', searchRange, useLocalScale, useRelativeScale);
    window.grapher.setColumns(graphColumns);
    window.grapher.setValueChangedListener(onAdjust);

    var plotterAxisX    = $('#plotAxisX').val();
    var plotterAxisY    = $('#plotAxisY').val();
    var plotterData     = searchBuildHints2d(queryParams, minScore, plotterAxisX, plotterAxisY, searchRange, hintSteps)
    var plotterPosition = new goog.math.Coordinate(queryParams[plotterAxisX], queryParams[plotterAxisY]);

    window.plotter = new Plotter('plotter', useRelativeScale);
    window.plotter.setUseRelativeScale(useRelativeScale);
    window.plotter.setPosition(plotterPosition);
    window.plotter.setData(plotterData);
    window.plotter.updateShapes();

    var results = searchData(queryParams, minScore);
    outputResults(results, maxResults);

    $('#keyword').text(query);
    $('#useLocalScale').prop('checked', useLocalScale);
    $('#useRelativeScale').prop('checked', useRelativeScale);
    $('#useLocalScale').click(function() {
        var useLocalScale = $('#useLocalScale').is(':checked');
        window.grapher.setUseLocalScale(useLocalScale);
    });
    $('#useRelativeScale').click(function() {
        var useRelativeScale = $('#useRelativeScale').is(':checked');
        window.grapher.setUseRelativeScale(useRelativeScale);
        window.plotter.setUseRelativeScale(useRelativeScale);
        window.plotter.updateShapes();
    });
    $('.plotAxes').change(function() {
        var wa = window.adjuster;
        var wp = window.plotter;

        var plotterAxisX    = $('#plotAxisX').val();
        var plotterAxisY    = $('#plotAxisY').val();
        var plotterData     = searchBuildHints2d(wa.queryParams, wa.minScore, plotterAxisX, plotterAxisY, wa.searchRange, wa.hintSteps)
        var plotterPosition = new goog.math.Coordinate(wa.queryParams[plotterAxisX], wa.queryParams[plotterAxisY]);

        wp.setPosition(plotterPosition);
        wp.setData(plotterData);
        wp.updateShapes();
    });
    $('#input').fadeOut(function() {
        $('#output').fadeIn();
    });
}

$(document).ready(function() {
    for (var keyword in DATA_KEYWORDS) {
        $('#query').append($('<option></option>', {
            'value': keyword,
            'text':  keyword
        }));
    }

    var features = ['food', 'service', 'value', 'atmosphere'];
    _.each(features, function(feature) {
        $('#plotAxisX').append($('<option></option>', {
            'value': feature,
            'text':  feature
        }));

        $('#plotAxisY').append($('<option></option>', {
            'value': feature,
            'text':  feature
        }));
    });

    $('#plotAxisX').val(features[0]);
    $('#plotAxisY').val(features[1]);

    $('#search').click(onQuery);
});
