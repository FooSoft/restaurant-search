/*

   The MIT License (MIT)

   Copyright (c) 2014 Alex Yatskov

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.

*/

(function(hscd) {
    'use strict';

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

        $.getJSON('/search', query, function(results) {
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

        $.getJSON('/search', query, function(results) {
            ctx.searchParams = query.searchParams;
            ctx.searchRange  = query.searchRange;
            ctx.minScore     = query.minScore;
            ctx.hintSteps    = query.hintSteps;
            ctx.maxResults   = query.maxResults;

            ctx.grapher = new grapher.Grapher('grapher', ctx.searchRange, 150, true, true);
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

            $.getJSON('/add_keyword', query, function(results) {
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

            $.getJSON('/remove_keyword', query, function(results) {
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

            $.getJSON('/get_keywords', function(keywords) {
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
                    $('#forgetError').hide();
                    $.getJSON('/get_keywords', function(keywords) {
                        $('#forgetKeyword').prop('disabled', keywords.length === 0);
                        $('#keywordToForget').empty();
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

/*
global
    $,
    Handlebars,
    document,
    grapher,
    window,
*/
