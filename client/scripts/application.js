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

    var ctx = {
        log: []
    };

    function onAdjust(name, value) {
        ctx.features[name] = value;

        var query = {
            features:   ctx.features,
            range:      ctx.range,
            minScore:   ctx.minScore,
            hintSteps:  ctx.hintSteps,
            maxResults: ctx.maxResults
        };

        ctx.grapher.enable(false);
        $.getJSON('/search', query, function(results) {
            saveSnapshot(results);
            outputSnapshot(results);
            ctx.grapher.enable(true);
        });
    }

    function onReady() {
        $('#history').on('slideStop', onSelectSnapshot);
        $('#history').slider({
            formatter: function(value) {
                var delta = ctx.log.length - (value + 1);
                switch (delta) {
                    case 0:
                        return 'Most recent query';
                    case 1:
                        return 'Previous query';
                    default:
                        return String(delta) + ' queries back';
                }
            }
        });

        $('#forgetKeyword').click(onForget);
        $('#forgetDialog').on('show.bs.modal', function() {
            $('#forgetError').hide();
            $.getJSON('/get_keywords', function(keywords) {
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
        $('#learnDialog').on('show.bs.modal', function() {
            $('#learnError').hide();
            $('#learnKeyword').prop('disabled', true);
            $('#keywordToLearn').val('');
        });
        $('#keywordToLearn').bind('input', function() {
            $('#learnKeyword').prop('disabled', !$(this).val());
        });

        $.getJSON('/get_keywords', function(keywords) {
            ctx.keywords = keywords;
            for (var keyword in keywords) {
                $('#keywordsToSearch').append($('<option></option>', { value: keyword, text: keyword }));
            }

            onSearch();
        });
    }

    function onSearch() {
        var keyword  = $('#keywordsToSearch').val();
        var features = {};

        for (var feature in ctx.keywords[keyword]) {
            features[feature] = 1.0;
        }

        var query = {
            features:   features,
            range:      { min: -1.0, max: 1.0 },
            minScore:   parseFloat($('#minScore').val()),
            hintSteps:  parseInt($('#hintSteps').val()),
            maxResults: parseInt($('#maxResults').val())
        };

        $.getJSON('/search', query, function(results) {
            ctx.features   = query.features;
            ctx.range      = query.range;
            ctx.minScore   = query.minScore;
            ctx.hintSteps  = query.hintSteps;
            ctx.maxResults = query.maxResults;

            ctx.grapher = new grapher.Grapher({
                canvas:           new Snap('#svg'),
                steps:            ctx.hintSteps,
                range:            ctx.range,
                onValueChanged:   onAdjust,
                useLocalScale:    true,
                useRelativeScale: true
            });
            ctx.grapher.setColumns(results.columns);

            saveSnapshot(results);
            outputMatches(results.items, results.count);

            $('#query').text(keyword);
            $('#useLocalScale').click(function() {
                var useLocalScale = $('#useLocalScale').is(':checked');
                ctx.grapher.setUseLocalScale(useLocalScale);
            });
            $('#useRelativeScale').click(function() {
                var useRelativeScale = $('#useRelativeScale').is(':checked');
                ctx.grapher.setUseRelativeScale(useRelativeScale);
            });
        });
    }

    function onLearn() {
        $('#learnKeyword').prop('disabled', true);
        $('#learnError').slideUp(function() {
            var query = {
                keyword: $('#keywordToLearn').val(),
                params:  ctx.features
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

    function onSelectSnapshot() {
        var index = $('#history').slider('getValue');
        outputSnapshot(ctx.log[index]);
    }

    function saveSnapshot(results) {
        ctx.log.push(results);

        var count = ctx.log.length;
        var history = $('#history').slider();
        history.slider('setAttribute', 'max', count - 1);
        history.slider('setValue', count - 1);

        if (count > 1) {
            $('#history').parent().slideDown();
        }
    }

    function outputSnapshot(results) {
        for (var name in results.columns) {
            ctx.features[name] = results.columns[name].value;
        }

        ctx.grapher.setColumns(results.columns);
        outputMatches(results.items, results.count);
    }

    function outputMatches(results, count) {
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
        ajaxStart: function() { $('#spinner').show(); },
        ajaxStop:  function() { $('#spinner').hide(); },
        ready:     onReady()
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
