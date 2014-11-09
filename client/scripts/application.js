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
        $.getJSON('/search', _ctx.query, function(results) {
            saveSnapshot(results);
            outputSnapshot(results);
            setCustomized(true);
        });
    }

    function onReady() {
        $('#historyIndex').slider({
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

        $.getJSON('/get_parameters', function(parameters) {
            _ctx.parameters = parameters;
            for (var keyword in parameters.keywords) {
                $('#searchKeyword').append($('<option></option>', { value: keyword, text: keyword }));
            }

            onSearch();

            $('#searchKeyword,#minScore,#hintSteps,#maxResults').change(onSearch);
            $('#historyIndex').on('slideStop', onSelectSnapshot);
            $('#learn').click(onLearn);
            $('#forget').click(onForget);
        });
    }

    function onLearn() {
        var keyword = prompt('Input keyword to learn as (alphanumeric, no spaces)');
        if (keyword === null) {
            return;
        }

        var query = {
            keyword:  keyword,
            features: _ctx.query.features
        };

        $.getJSON('/add_keyword', query, function(results) {
            if (results.success) {
                _ctx.parameters.keywords[keyword] = query.features;
                $('#searchKeyword').append($('<option></option>', { value: keyword, text: keyword }));
                $('#searchKeyword').val(keyword);
            }
            else {
                alert('Failed to learn keyword');
            }
        });
    }

    function onForget() {

    }

    function onSearch() {
        var keyword = $('#searchKeyword').val();

        _ctx.query = {
            features:   _ctx.parameters.keywords[keyword],
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
            saveSnapshot(results);
            outputSnapshot(results);
            setCustomized(false);
        });
    }

    function onSelectSnapshot() {
        var index = $('#historyIndex').slider('getValue');
        outputSnapshot(_ctx.log[index]);
        setCustomized(true);
    }

    function saveSnapshot(results) {
        _ctx.log.push(results);

        var count = _ctx.log.length;
        var history = $('#historyIndex').slider();
        history.slider('setAttribute', 'max', count - 1);
        history.slider('setValue', count - 1);

        if (count > 1) {
            $('#history').slideDown();
        }
    }

    function setCustomized(customized) {
        $('#forget').prop('disabled', customized);
        if (customized) {
            $('#customized').show();
        }
        else {
            $('#customized').hide();
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

        $('#resultCount').text(searchResultCnt);
        $('#resultPanel').slideDown();

        var template = Handlebars.compile($('#template').html());
        $('#results').empty();
        $('#results').append(template({'results': results}));
    }

    $(document).on({
        ajaxStart: function() {
            if (_.has(_ctx, 'grapher')) {
                _ctx.grapher.enable(false);
            }
            $('#spinner').show();
        },

        ajaxStop: function() {
            if (_.has(_ctx, 'grapher')) {
                _ctx.grapher.enable(true);
            }
            $('#spinner').hide();
        },

        ready: onReady()
    });

}(window.hscd = window.hscd || {}));
