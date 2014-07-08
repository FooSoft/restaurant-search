'use strict';

function innerProduct(values1, values2) {
    console.assert(values1.length == values2.length);

    var result = 0;
    for (var i = 0, count = values1.length; i < count; ++i) {
        result += values1[i] * values2[i];
    }

    return result;
}

function searchImages(queryParams, maxDistance) {
    var sd      = spaceDatabase;
    var results = [];

    for (var filename in sd) {
        var imageParams = sd[filename];
        var distance    = innerProduct(queryParams, imageParams);

        if (distance < maxDistance) {
            results.push({
               filename: filename,
               distance: distance
            });
        }
    }

    results.sort(function (a, b) {
        return a.distance - b.distance;
    });

    return results;
}

function searchProjection(queryParams, maxDistance, index, range, steps) {
    var sd         = spaceDatabase;
    var stepSize   = range.getLength() / steps;
    var testParams = queryParams.slice();
    var results    = {};

    for (var i = 0; i < steps; ++i) {
        var stepMax = range.end - stepSize * i;
        var stepMin = stepMax - stepSize;
        var stepMid = (stepMin + stepMax) / 2;

        testParams[index] = stepMid;
        results[stepMid] = searchImages(testParams, maxDistance);
    }

    return results;
}

function searchBuildHints(queryParams, maxDistance, index, range, steps) {
    var projection = searchProjection(queryParams, maxDistance, index, range, steps);

    var hints = [];
    for (var position in projection) {
        var count = projection[position].length;
        for (var i = 0; i < count; ++i) {
            hints.push(position);
        }
    }

    return hints;
}

function outputResults(results, maxDistance) {
    $('#results').empty();
    $('#count').text(results.length);

    results.forEach(function(x) {
        var strengthRgb = goog.color.lighten([0, 0, 0], x.distance / maxDistance);
        var resultStyle = {
            'background-color': goog.color.rgbToHex.apply(this, strengthRgb)
        };

        $('#results').append($('<img>', {
            'src':            'images/' + x.filename,
            'width':          100,
            'height':         100,
            'title':          Math.round(x.distance),
            'data-toggle':    'tooltip',
            'data-placement': 'bottom',
            'class':          'img-thumbnail result'
        }).css(resultStyle).tooltip());
    });
}

function onAdjust(name, value) {
    var wa = window.adjuster;
    var wg = window.grapher;

    var featureIndex = wa.indexMap[name];
    wa.queryParams[featureIndex] = value;

    for (var name in wa.indexMap) {
        var index = wa.indexMap[name];
        var hints = searchBuildHints(wa.queryParams, wa.maxDistance, index, wa.searchRange, wa.hintSteps);
        wg.setColumnHints(name, hints);
    }

    outputResults(
        searchImages(wa.queryParams, wa.maxDistance),
        wa.maxDistance
    );
}

function onQuery() {
    var query       = $('#query').val();
    var maxDistance = parseInt($('#maxDistance').val()) || 25000;
    var hintSteps   = parseInt($('#hintSteps').val()) || 100;
    var sd          = spaceDefinitions;

    console.assert(query in sd.keywords);

    var queryParams  = sd.keywords[query];
    var searchRange  = new goog.math.Range(0.0, 1.0);
    var graphColumns = {};
    var indexMap     = {};

    for (var i = 0, count = sd.features.length; i < count; ++i) {
        if (queryParams[i] == 0) {
            continue;
        }

        var feature = sd.features[i];
        var rgb     = goog.color.rgbToHex.apply(this, feature.rgb);
        var hints   = searchBuildHints(queryParams, maxDistance, i, searchRange, hintSteps);

        indexMap[feature.name] = i;
        graphColumns[feature.name] = {
            color: rgb,
            value: queryParams[i],
            hints: hints
        };
    }

    window.adjuster = {
        queryParams: queryParams,
        searchRange: searchRange,
        hintSteps:   hintSteps,
        maxDistance: maxDistance,
        indexMap:    indexMap
    };

    window.grapher = new Grapher('canvas');
    window.grapher.setColumns(graphColumns);
    window.grapher.setValueChangedListener(onAdjust);

    outputResults(
        searchImages(queryParams, maxDistance),
        maxDistance
    );

    $('#keyword').text(query);

    $('#input').fadeOut(function () {
        $('#output').fadeIn();
    });
}

$(document).ready(function () {
    for (var keyword in spaceDefinitions.keywords) {
        $('#query').append($('<option></option>', {
            'value': keyword,
            'text':  keyword
        }));
    }

    $('#search').click(onQuery);
});
