'use strict';

var app = { };


function outputResults(results, maxResults) {
    $('#results').empty();
    $('#count').text(results.length);

    results = results.splice(0, maxResults);

    var template = Handlebars.compile($('#template').html());
    $('#results').append(template({'results': results}));
}

function onAdjust(name, value) {
    app.searchParams[name] = value;
    console.log(app.searchParams);

    var params = {
        searchParams: app.searchParams,
        searchRange:  app.searchRange,
        minScore:     app.minScore,
        hintSteps:    app.hintSteps,
        maxResults:   app.maxResults
    };

    $.getJSON('/node/search', params, function(results) {
        var hintData = { };
        for (var feature in results.columns) {
            hintData[feature] = results.columns[feature].hints;
        }

        app.grapher.setColumnHints(hintData);
        outputResults(results.items, params.maxResults);
    });
}

function onSearch() {
    var params = {
        keyword:     $('#keyword').val(),
        searchRange: { min: -1.0, max: 1.0 },
        minScore:    parseInt($('#minScore').val()),
        hintSteps:   parseInt($('#hintSteps').val()),
        maxResults:  parseInt($('#maxResults').val())
    };

    $.getJSON('/node/search', params, function(results) {
        app.searchParams = results.params;
        app.searchRange  = params.searchRange;
        app.minScore     = params.minScore;
        app.hintSteps    = params.hintSteps;
        app.maxResults   = params.maxResults;

        app.grapher = new Grapher('grapher', app.searchRange, true, true);
        app.grapher.setColumns(results.columns);
        app.grapher.setValueChangedListener(onAdjust);

        outputResults(results.items, params.maxResults);

        $('#query').text(params.keyword);
        $('#useLocalScale').click(function() {
            var useLocalScale = $('#useLocalScale').is(':checked');
            app.grapher.setUseLocalScale(useLocalScale);
        });
        $('#useRelativeScale').click(function() {
            var useRelativeScale = $('#useRelativeScale').is(':checked');
            app.grapher.setUseRelativeScale(useRelativeScale);
        });
        $('#input').fadeOut(function() {
            $('#output').fadeIn();
        });
    });
}

$(document).ready(function() {
    $.getJSON('/node/keywords', function(keywords) {
        for (var i = 0; i < keywords.length; ++i) {
            var properties = { value: keywords[i], text: keywords[i] };
            $('#keyword').append($('<option></option>', properties));
        }

        $('#search').prop('disabled', false);
        $('#search').click(onSearch);
    });
});
