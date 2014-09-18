'use strict';


(function(hscd) {
    var ctx = {};

    function onAdjust(name, value) {
        ctx.searchParams[name] = value;

        var query = {
            searchParams: ctx.searchParams,
            searchRange:  ctx.searchRange,
            minScore:     ctx.minScore,
            hintSteps:    ctx.hintSteps,
            maxResults:   ctx.maxResults
        };

        $.getJSON('/node/search', query, function(results) {
            var hintData = {};
            for (var keyword in results.columns) {
                hintData[keyword] = results.columns[keyword].hints;
            }

            ctx.grapher.setColumnHints(hintData);
            outputResults(results.items, results.count);
        });
    }

    function onSearch() {
        var keywords     = $('#keywords').val() || [];
        var searchParams = {};

        for (var i = 0, count = keywords.length; i < count; ++i) {
            searchParams[keywords[i]] = 1.0;
        }

        var query = {
            searchParams: searchParams,
            searchRange:  { min: -1.0, max: 1.0 },
            minScore:     parseFloat($('#minScore').val()),
            hintSteps:    parseInt($('#hintSteps').val()),
            maxResults:   parseInt($('#maxResults').val())
        };

        $.getJSON('/node/search', query, function(results) {
            ctx.searchParams = query.searchParams;
            ctx.searchRange  = query.searchRange;
            ctx.minScore     = query.minScore;
            ctx.hintSteps    = query.hintSteps;
            ctx.maxResults   = query.maxResults;

            ctx.grapher = new Grapher('grapher', ctx.searchRange, 150, true, true);
            ctx.grapher.setColumns(results.columns);
            ctx.grapher.setValueChangedListener(onAdjust);

            outputResults(results.items, results.count);

            $('#query').text(keywords.join(', '));
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

    function onLearn() {
        var query = {
            keyword: $('#keyword').val(),
            params:  ctx.searchParams
        };

        $.getJSON('/node/addKeyword', query, function(results) {
            console.log(results);
        });
    }

    function outputResults(results, count) {
        $('#results').empty();

        var searchResultCnt = String(results.length);
        if (results.length < count) {
            searchResultCnt += ' of ' + count;
        }
        $('#count').text(searchResultCnt);

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
            $('#keywords').selectpicker();

            $.getJSON('/node/getKeywords', function(keywords) {
                for (var i = 0, count = keywords.length; i < count; ++i) {
                    $('#keywords').append($('<option></option>', {
                        value: keywords[i],
                        text:  keywords[i]
                    }));
                }

                $('#search').click(onSearch);
                $('#learn').click(onLearn);
                $('#keywords').selectpicker('refresh');
                $('#keywords').change(function() {
                    $('#search').prop('disabled', $(this).val() === null);
                });
            });
        }
    });

}(window.hscd = window.hscd || {}));
