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

    function stateChanged(name, value, mode) {
        _ctx.query.features[name] = value;
        _ctx.query.modes[name]    = mode;

        $.post('/query', JSON.stringify(_ctx.query), function(results) {
            saveSnapshot(results);
            outputSnapshot(results, true);
        }, 'json');
    }

    function ready(geo) {
        _ctx = {
            sortKey: 'score',
            sortAsc: false,
            query:   {},
            markers: [],
            map:     null,
            geo:     geo
        };

        Handlebars.registerHelper('prettyFloat', function(precision, options) {
            return parseFloat(options.fn(this)).toFixed(precision);
        });

        $('#minScore,#resolution,#walkingDist,#maxResults').change(onSearch);
        $('#profileDlg').on('hidden.bs.modal', onSearch);
        $('#resetStorage').click(function() {
            if (confirm('Are you sure you want to reset your profile?')) {
                localStorage.clear();
                $('iframe').attr('src', $('iframe').attr('src'));
            }
        });
        $('.nav-tabs a[href="#mapTab"]').one('shown.bs.tab', function(e) {
            var options = {
                center: { lat: 35.6833, lng: 139.7667 }, zoom: 8
            };

            if (geo !== null) {
                options.center = {
                    lat: geo.coords.latitude,
                    lng: geo.coords.longitude
                };
            }

            _ctx.map = new google.maps.Map(document.getElementById('map'), options);
            for (var i = 0; i < _ctx.markers.length; ++i) {
                _ctx.markers[i].setMap(_ctx.map);
            }
        });

        window.accessReview = function(id, latitude, longitude) {
            $('.nav-tabs a[href="#mapTab"]').tab('show');

            var setter = function(e) {
                _ctx.map.setCenter({lat: latitude, lng: longitude});
                _ctx.map.setZoom(18);
            };

            if (_ctx.map === null) {
                $('.nav-tabs a[href="#mapTab"]').one('shown.bs.tab', setter);
            }
            else {
                setter();
            }

            $.post('/access', JSON.stringify({id: id, profile: getProfile()}));

            onSearch();
        };

        window.sortReviewsBy = function(sortKey) {
            if (sortKey === _ctx.sortKey) {
                _ctx.sortAsc = !_ctx.sortAsc;
            }
            else {
                _ctx.sortKey = sortKey;
            }

            onSearch();
        };

        onSearch();
    }

    function onSearch() {
        _ctx.query = {
            features:    _ctx.query.features || {},
            modes:       _ctx.query.modes || {},
            sortKey:     _ctx.sortKey,
            sortAsc:     _ctx.sortAsc,
            profile:     getProfile(),
            walkingDist: parseFloat($('#walkingDist').val()),
            minScore:    parseFloat($('#minScore').val()),
            resolution:  parseInt($('#resolution').val()),
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
                    canvas:        new Snap('#svg'),
                    stateChanged:  stateChanged,
                    displayType:   $('#displayType').val(),
                    useLocalScale: $('#useLocalScale').is(':checked')
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
                        value:   column.value,
                        hints:   column.hints,
                        bracket: column.bracket,
                        mode:    column.mode
                    };
                }

                _ctx.grapher.setColumns(columns);
            }

            saveSnapshot(results);
            outputSnapshot(results, false);
        }, 'json');
    }

    function saveSnapshot(results) {
        window.history.pushState(results, null, null);
    }

    function outputSnapshot(results, omitValues) {
        var records = results.records || [];

        _ctx.query.minScore = results.minScore;
        $('#minScore').val(results.minScore);

        var columns = {};
        for (var name in results.columns) {
            var column = results.columns[name];
            columns[name] = omitValues ? _.omit(column, 'value') : column;
            _ctx.query.features[name] = column.value;
        }

        _ctx.grapher.setColumns(columns);

        var searchResultCnt = String(records.length);
        if (records.length < results.count) {
            searchResultCnt += ' of ' + results.count;
        }
        $('#resultCount').text(searchResultCnt);
        $('#elapsedTime').text(Math.round(results.elapsedTime / 1000000) + ' ms');

        var template = Handlebars.compile($('#template').html());
        $('#records').empty();
        $('#records').append(template({records: records}));

        for (var i = 0; i < _ctx.markers.length; ++i) {
            _ctx.markers[i].setMap(null);
        }
        _ctx.markers = [];

        for (var j = 0; j < records.length; ++j) {
            var record = records[j];
            var pos    = { lat: record.geo.latitude, lng: record.geo.longitude };
            var marker = new google.maps.Marker({ position: pos, map: _ctx.map, title: record.name });

            _ctx.markers.push(marker);
        }

        $('span.sort-icon').css('visibility', 'hidden');
        var currentColumn = $('span.sort-icon[data-sort="' + _ctx.sortKey + '"]').css('visibility', 'visible');
        if (_ctx.sortAsc) {
            currentColumn.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
        }
        else {
            currentColumn.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
        }

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
                    function(geo) { ready(geo); },
                    function(err) { ready(null); },
                    { enableHighAccuracy: true }
                );
            }
            else {
                ready(null);
            }
        }
    });
}(window.hscd = window.hscd || {}));
