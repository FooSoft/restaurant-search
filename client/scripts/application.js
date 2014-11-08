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

    var _custom = '[custom]';
    var _ctx    = { log: [] };

    function onAdjust(name, value) {
        _ctx.query.features[name] = value;
        _ctx.grapher.enable(false);

        $.getJSON('/search', _ctx.query, function(results) {
            saveSnapshot(results);
            outputSnapshot(results);
            _ctx.grapher.enable(true);
        });
    }

    function onReady() {
        $('#history').on('slideStop', onSelectSnapshot);
        $('#history').slider({
            formatter: function(value) {
                var delta = _ctx.log.length - (value + 1);
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

        $('#learnKeyword').click(onLearn);
        $('#learnDialog').on('show.bs.modal', function() {
            $('#learnError').hide();
            $('#learnKeyword').prop('disabled', true);
            $('#keywordToLearn').val('');
        });
        $('#keywordToLearn').bind('input', function() {
            $('#learnKeyword').prop('disabled', !$(this).val());
        });

        $.getJSON('/get_parameters', function(parameters) {
            _ctx.parameters = parameters;
            for (var keyword in parameters.keywords) {
                $('#keywordsToSearch').append($('<option></option>', { value: keyword, text: keyword }));
            }

            search();
        });
    }

    function search(keyword) {
        var features = {};
        if (typeof(keyword) == 'undefined') {
            for (var i = 0, count = _ctx.parameters.features.length; i < count; ++i) {
                features[_ctx.parameters.features[i]] = 0.0;
            }
        }
        else {
            features = _ctx.parameters.keywords[keyword];
        }

        _ctx.query = {
            features:   features,
            range:      { min: -1.0, max: 1.0 },
            minScore:   parseFloat($('#minScore').val()),
            hintSteps:  parseInt($('#hintSteps').val()),
            maxResults: parseInt($('#maxResults').val())
        };

        if (!_.has(_ctx, 'grapher')) {
            _ctx.grapher = new grapher.Grapher({
                canvas:           new Snap('#svg'),
                steps:            _ctx.query.hintSteps,
                range:            _ctx.query.range,
                onValueChanged:   onAdjust,
                useLocalScale:    true,
                useRelativeScale: true
            });

            $('#useLocalScale').click(function() {
                var useLocalScale = $('#useLocalScale').is(':checked');
                _ctx.grapher.setUseLocalScale(useLocalScale);
            });
            $('#useRelativeScale').click(function() {
                var useRelativeScale = $('#useRelativeScale').is(':checked');
                _ctx.grapher.setUseRelativeScale(useRelativeScale);
            });

            var columns = {};
            for (var feature in _ctx.query.features) {
                columns[feature] = { value: 0.0, hints: [] };
            }

            _ctx.grapher.setColumns(columns);
        }

        $.getJSON('/search', _ctx.query, function(results) {
            _ctx.grapher.setColumns(results.columns);
            saveSnapshot(results);
            outputMatches(results.items, results.count);
        });
    }

    function onLearn() {
        $('#learnKeyword').prop('disabled', true);
        $('#learnError').slideUp(function() {
            var query = {
                keyword: $('#keywordToLearn').val(),
                params:  _ctx.query.features
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

    function onSelectSnapshot() {
        var index = $('#history').slider('getValue');
        outputSnapshot(_ctx.log[index]);
    }

    function saveSnapshot(results) {
        _ctx.log.push(results);

        var count = _ctx.log.length;
        var history = $('#history').slider();
        history.slider('setAttribute', 'max', count - 1);
        history.slider('setValue', count - 1);

        if (count > 1) {
            $('#history').parent().slideDown();
        }
    }

    function outputSnapshot(results) {
        for (var name in results.columns) {
            _ctx.query.features[name] = results.columns[name].value;
        }

        _ctx.grapher.setColumns(results.columns);
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
