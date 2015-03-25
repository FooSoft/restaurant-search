/*
 * Copyright (c) 2015 Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function(hscd) {
    'use strict';

    var _ctx = {};

    function onAdjust(name, value) {
        _ctx.query.features[name] = value;

        $.post('/query', JSON.stringify(_ctx.query), function(results) {
            saveSnapshot(results);
            outputSnapshot(results, true);
        }, 'json');
    }

    function onReady(geo) {
        _ctx = {
            geo:   geo,
            query: {}
        };

        $('#minScore,#hintSteps,#walkingDist,#maxResults').change(onSearch);
        $('#profileDlg').on('hidden.bs.modal', onSearch);
        $('#resetStorage').click(function() {
            if (confirm('Are you sure you want to reset your profile?')) {
                localStorage.clear();
                $('iframe').attr('src', $('iframe').attr('src'));
            }
        });

        window.accessReview = function(id) {
            $.post('/access', JSON.stringify({id: id, profile: getProfile()}), function(results) {
                if (results.success) {
                    location.replace(results.url);
                }
            }, 'json');
        };

        onSearch();
    }

    function onSearch() {
        _ctx.query = {
            features:    _ctx.query.features || {},
            profile:     getProfile(),
            walkingDist: parseFloat($('#walkingDist').val()),
            minScore:    parseFloat($('#minScore').val()),
            hintSteps:   parseInt($('#hintSteps').val()),
            maxResults:  parseInt($('#maxResults').val())
        };

        if (_ctx.geo) {
            _ctx.query.geo = {
                latitude:  _ctx.geo.coords.latitude,
                longitude: _ctx.geo.coords.longitude
            };
        }

        $.post('/query', JSON.stringify(_ctx.query), function(results) {
            if (!_.has(_ctx, 'grapher')) {
                _ctx.grapher = new grapher.Grapher({
                    canvas:         new Snap('#svg'),
                    steps:          _ctx.query.hintSteps,
                    onValueChanged: onAdjust,
                    displayType:    $('#displayType').val(),
                    useLocalScale:  $('#useLocalScale').is(':checked')
                });

                $('#useLocalScale').click(function() {
                    _ctx.grapher.setUseLocalScale($('#useLocalScale').is(':checked'));
                });

                $('#useRelativeScale').click(function() {
                    _ctx.grapher.setUseRelativeScale($('#useRelativeScale').is(':checked'));
                });

                $('#displayType').change(function() {
                    _ctx.grapher.setDisplayType($('#displayType').val());
                });

                var columns = {};
                for (var feature in results.columns) {
                    var column = results.columns[feature];
                    _ctx.query.features[feature] = column.value;
                    columns[feature] = {
                        value: column.value,
                        hints: column.hints
                    };
                }

                _ctx.grapher.setColumns(columns);
            }

            saveSnapshot(results);
            outputSnapshot(results, false);
        }, 'json');
    }

    function saveSnapshot(results) {
        window.history.pushState(results);
    }

    function outputSnapshot(results, omitValues) {
        var columns = {};
        for (var name in results.columns) {
            var column = results.columns[name];
            columns[name] = omitValues ? _.omit(column, 'value') : column;
            _ctx.query.features[name] = column.value;
        }

        _ctx.grapher.setColumns(columns);
        outputMatches(results.records, results.count);
    }

    function outputMatches(records, count) {
        var searchResultCnt = String(records.length);
        if (records.length < count) {
            searchResultCnt += ' of ' + count;
        }
        $('#resultCount').text(searchResultCnt);

        var template = Handlebars.compile($('#template').html());
        $('#records').empty();
        $('#records').append(template({records: records}));

        if (records.length === 0) {
            $('#resultPanel').slideUp();
        }
        else {
            $('#resultPanel').slideDown();
        }
    }

    function getProfile() {
        return JSON.parse(localStorage.profile || '{}');
    }

    window.onpopstate = function(state) {
        if (state.state) {
            outputSnapshot(state.state, false);
        }
    };

    $(document).on({
        ajaxStart: function() {
            $('#spinner').show();
        },
        ajaxStop: function() {
            $('#spinner').hide();
        },
        ready: function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(geo) { onReady(geo); },
                    function(err) { onReady(null); },
                    { enableHighAccuracy: true }
                );
            }
            else {
                onReady(null);
            }
        }
    });
}(window.hscd = window.hscd || {}));
