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
        var keywords     = $('#keywordsToSearch').val() || [];
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
        $('#learnKeyword').prop('disabled', true);

        $('#learnError').slideUp(function() {
            var query = {
                keyword: $('#keywordToLearn').val(),
                params:  ctx.searchParams
            };

            $.getJSON('/node/addKeyword', query, function(results) {
                if (results.success) {
                    $('#learnDialog').modal('hide');
                }
                else {
                    $('#learnError').slideDown(function() {
                        $('#learnKeyword').prop('disabled', false);
                    });
                }
            });
        });
    }

    function onForget() {
        $('#forgetKeyword').prop('disabled', true);

        $('#forgetError').slideUp(function() {
            var query = {
                keyword: $('#keywordToForget').val()
            };

            $.getJSON('/node/removeKeyword', query, function(results) {
                if (results.success) {
                    $('#forgetDialog').modal('hide');
                }
                else {
                    $('#forgetError').slideDown(function() {
                        $('#forgetKeyword').prop('disabled', false);
                    });
                }
            });
        });
    }

    function outputResults(results, count) {
        var searchResultCnt = String(results.length);
        if (results.length < count) {
            searchResultCnt += ' of ' + count;
        }
        $('#count').text(searchResultCnt);

        var template = Handlebars.compile($('#template').html());
        $('#results').empty();
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
            $('#keywordsToSearch').selectpicker();

            $.getJSON('/node/getKeywords', function(keywords) {
                $('#searchKeywords').click(onSearch);
                for (var i = 0, count = keywords.length; i < count; ++i) {
                    $('#keywordsToSearch').append($('<option></option>', {
                        value: keywords[i],
                        text:  keywords[i]
                    }));
                }
                $('#keywordsToSearch').selectpicker('refresh');
                $('#keywordsToSearch').change(function() {
                    $('#searchKeywords').prop('disabled', !$(this).val());
                });

                $('#forgetKeyword').click(onForget);
                $('#forgetDialog').on('show.bs.modal', function() {
                    $.getJSON('/node/getKeywords', function(keywords) {
                        $('#forgetKeyword').prop('disabled', keywords.length === 0);
                        for (var i = 0, count = keywords.length; i < count; ++i) {
                            $('#keywordToForget').append($('<option></option>', {
                                value: keywords[i],
                                text:  keywords[i]
                            }));
                        }
                    });
                });

                $('#learnKeyword').click(onLearn);
                $('#keywordToLearn').bind('input', function() {
                    $('#learnKeyword').prop('disabled', !$(this).val());
                });
                $('#learnDialog').on('show.bs.modal', function() {
                    $('#learnKeyword').prop('disabled', true);
                    $('#keywordToLearn').val('');
                    $('#learnError').hide();
                });
            });
        }
    });

}(window.hscd = window.hscd || {}));
