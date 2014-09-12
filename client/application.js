'use strict';


(function(hscd) {
    var ctx = {};

    function onAdjust(name, value) {
        ctx.searchParams[name] = value;

        var params = {
            searchParams: ctx.searchParams,
            searchRange:  ctx.searchRange,
            minScore:     ctx.minScore,
            hintSteps:    ctx.hintSteps,
            maxResults:   ctx.maxResults
        };

        $.getJSON('/node/search', params, function(results) {
            var hintData = {};
            for (var keyword in results.columns) {
                hintData[keyword] = results.columns[keyword].hints;
            }

            ctx.grapher.setColumnHints(hintData);
            outputResults(results.items, params.maxResults);
        });
    }

    function onSearch() {
        var params = {
            keywords:    $('#keywords').val(),
            searchRange: { min: -1.0, max: 1.0 },
            minScore:    parseInt($('#minScore').val()),
            hintSteps:   parseInt($('#hintSteps').val()),
            maxResults:  parseInt($('#maxResults').val())
        };

        $.getJSON('/node/search', params, function(results) {
            ctx.searchParams = results.params;
            ctx.searchRange  = params.searchRange;
            ctx.minScore     = params.minScore;
            ctx.hintSteps    = params.hintSteps;
            ctx.maxResults   = params.maxResults;

            ctx.grapher = new Grapher('grapher', ctx.searchRange, true, true);
            ctx.grapher.setColumns(results.columns);
            ctx.grapher.setValueChangedListener(onAdjust);

            outputResults(results.items, params.maxResults);

            $('#query').text(params.keyword);
            $('#useLocalScale').click(function() {
                var useLocalScale = $('#useLocalScale').is(':checked');
                ctx.grapher.setUseLocalScale(useLocalScale);
            });
            $('#useRelativeScale').click(function() {
                var useRelativeScale = $('#useRelativeScale').is(':checked');
                ctx.grapher.setUseRelativeScale(useRelativeScale);
            });
            $('#input').fadeOut(function() {
                $('#output').fadeIn();
            });
        });
    }

    function outputResults(results, maxResults) {
        $('#results').empty();
        $('#count').text(results.length);

        results = results.splice(0, maxResults);

        var template = Handlebars.compile($('#template').html());
        $('#results').append(template({'results': results}));
    }

    $(document).on({
        ajaxStart: function() {
            $('#spinner').show();
        },

        ajaxStop: function() {
            $('#spinner').hide();
        },

        ready: function() {
            $.getJSON('/node/keywords', function(keywords) {
                for (var i = 0, count = keywords.length; i < count; ++i) {
                    $('#keywords').append($('<option></option>', {
                        value: keywords[i],
                        text:  keywords[i]
                    }));
                }

                $('#search').prop('disabled', false);
                $('#search').click(onSearch);
            });
        }
    });

}(window.hscd = window.hscd || {}));
