'use strict';

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

    wa.queryParams[name] = value;
    console.log(wa.queryParams);

    var hintData = {};
    _.each(wg.getColumnNames(), function(name) {
        hintData[name] = searchBuildHints(wa.queryParams, wa.minScore, name, wa.searchRange, wa.hintSteps);
    });
    wg.setColumnHints(hintData);

    var results = searchData(wa.queryParams, wa.minScore);
    outputResults(results, wa.maxResults);
}

function onSearch() {
    var params = {
        'keyword':          $('#keyword').val(),
        'minScore':         parseInt($('#minScore').val()),
        'hintSteps':        parseInt($('#hintSteps').val()),
        'maxResults':       parseInt($('#maxResults').val()),
        'useLocalScale':    true,
        'useRelativeScale': true
    };

    $.getJSON('/node/search', params, function(results) {
        alert('searched');
    });

//     var queryParams  = DATA_KEYWORDS[query];
//     var searchRange  = new goog.math.Range(-1.0, 1.0);
//     var graphColumns = {};

//     for (var feature in queryParams) {
//         var hints = searchBuildHints(
//             queryParams,
//             minScore,
//             feature,
//             searchRange,
//             hintSteps
//         );

//         graphColumns[feature] = {
//             'color': '#607080',
//             'value': queryParams[feature],
//             'hints': hints,
//             'steps': hintSteps
//         }
//     }

//     window.adjuster = {
//         queryParams: queryParams,
//         searchRange: searchRange,
//         hintSteps:   hintSteps,
//         minScore:    minScore,
//         maxResults:  maxResults
//     };

//     window.grapher = new Grapher('grapher', searchRange, useLocalScale, useRelativeScale);
//     window.grapher.setColumns(graphColumns);
//     window.grapher.setValueChangedListener(onAdjust);

//     var results = searchData(queryParams, minScore);
//     outputResults(results, maxResults);

//     $('#query').text(query);
//     $('#useLocalScale').prop('checked', useLocalScale);
//     $('#useRelativeScale').prop('checked', useRelativeScale);
//     $('#useLocalScale').click(function() {
//         var useLocalScale = $('#useLocalScale').is(':checked');
//         window.grapher.setUseLocalScale(useLocalScale);
//     });
//     $('#useRelativeScale').click(function() {
//         var useRelativeScale = $('#useRelativeScale').is(':checked');
//         window.grapher.setUseRelativeScale(useRelativeScale);
//     });
//     $('#input').fadeOut(function() {
//         $('#output').fadeIn();
//     });
}

$(document).ready(function() {
    $.getJSON('/node/keywords', function(keywords) {
        for (var i = 0; i < keywords.length; ++i) {
            $('#keyword').append($('<option></option>', {
                'value': keywords[i],
                'text':  keywords[i]
            }));
        }

        $('#search').prop('disabled', false);
        $('#search').click(onSearch);
    });
});
