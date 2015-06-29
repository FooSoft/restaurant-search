/*
 * Copyright (c) 2015 Alex Yatskov <alex@foosoft.net>
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

(function(grapher) {
    'use strict';

    //
    //  Range
    //

    function Range(min, max) {
        this.min = Math.min(min, max);
        this.max = Math.max(min, max);

        this.contains = function(value) {
            return value >= this.min && value <= this.max;
        };

        this.length = function() {
            return this.max - this.min;
        };

        this.clamp = function(value) {
            if (value < this.min) {
                return this.min;
            }

            if (value > this.max) {
                return this.max;
            }

            return value;
        };

        this.include = function(range) {
            this.min = Math.min(this.min, range.min);
            this.max = Math.max(this.max, range.max);
        };

        this.offset = function(value) {
            return (value - this.min) / this.length();
        };

        this.project = function(value) {
            return this.min + this.length() * value;
        };
    }


    //
    //  Column
    //

    function Column(params) {
        var _borderColor    = '#d3d7cf';
        var _bracketColorBg = '#ffffff';
        var _bracketColorFg = '#555753';
        var _bracketColorPt = '#2e3436';
        var _fillColorBg    = '#eeeeec';
        var _fillColorNeg   = '#3465a4';
        var _fillColorPos   = '#cc0000';
        var _panelColor     = '#d3d7cf';
        var _tickColor      = '#d3d7cf';

        var _anchorSize     = 2;
        var _bracketSize    = 10;
        var _densitySize    = 10;
        var _desatOffset    = -0.3;
        var _easeTime       = 400;
        var _height         = 500;
        var _padding        = 10;
        var _panelSize      = 20;
        var _modeSize       = 20;
        var _tickSize       = 5;
        var _width          = 120;

        var _indicatorAnim  = null;
        var _bracketAnim    = null;
        var _canvas         = params.canvas;
        var _data           = params.data;
        var _index          = params.index;
        var _name           = params.name;
        var _valueTrans     = params.data.value;
        var _bracketTrans   = params.data.bracket;
        var _onStateChanged = params.onStateChanged;
        var _range          = params.range;
        var _scale          = params.scale;
        var _elements       = {};

        function createShapes() {
            // indicatorBg
            _elements.indicatorBg = _canvas.rect(
                _densitySize,
                0,
                _width - (_bracketSize + _densitySize),
                _height - (_panelSize + _modeSize)
            ).attr({
                cursor: 'crosshair',
                stroke: _borderColor,
                fill:   _fillColorBg
            }).click(indicatorClick);

            // density
            _elements.density = _canvas.rect(
                0,
                0,
                _densitySize,
                _height - (_panelSize + _modeSize)
            ).attr({
                stroke: _borderColor
            });

            // panel
            _elements.panel = _canvas.rect(
                0,
                _height - (_panelSize + _modeSize),
                _width - _bracketSize,
                _panelSize
            ).attr({
                fill: _panelColor
            });

            // label
            _elements.label = _canvas.text(
                (_width - _bracketSize) / 2,
                _height - (_panelSize / 2 + _modeSize),
                _name
            ).attr({
                'dominant-baseline': 'middle',
                'text-anchor':       'middle'
            });

            // bracketBg
            _elements.bracketBg = _canvas.rect(
                _width - _bracketSize,
                0,
                _bracketSize,
                _height - (_panelSize + _modeSize)
            ).attr({
                fill: _bracketColorBg
            });

            // indiciator
            updateIndicator(_data.value);

            // bracket
            updateBracket(_data.bracket);

            // mode
            updateMode();

            // tick
            if (_range.contains(0.0)) {
                var origin = valueToIndicator(0.0);
                _elements.tick = _canvas.line(
                    _densitySize,
                    origin,
                    _width - _bracketSize + _tickSize,
                    origin
                ).attr({
                    stroke: _tickColor
                });
            }

            _elements.group = _canvas.group(
                _elements.indicatorBg,
                _elements.indicator,
                _elements.density,
                _elements.bracketBg,
                _elements.bracketPath,
                _elements.bracketMin,
                _elements.bracketMax,
                _elements.panel,
                _elements.tick,
                _elements.label,
                _elements.mode
            );

            _elements.group.transform(
                Snap.format('t{x},{y}', {x: _index * (_width + _padding), y: 0})
            );

            updateDensity();
        }

        function updateIndicator(value) {
            var range = computeIndicatorRange(value);
            var fill  = computeIndicatorColor(value);

            if (_.has(_elements, 'indicator')) {
                _elements.indicator.attr({
                    y:      range.min,
                    height: range.max - range.min,
                    fill:   fill
                });

                _valueTrans = value;
            }
            else {
                _elements.indicator = _canvas.rect(
                    _densitySize,
                    range.min,
                    _width - (_densitySize + _bracketSize),
                    (range.max - range.min)
                ).attr({
                    cursor: 'crosshair',
                    fill:   fill
                }).click(indicatorClick);
            }
        }

        function updateBracket(bracket) {
            var visibility = bracket.min <= bracket.max ? 'visible' : 'hidden';

            var yMin  = valueToBracket(bracket.min);
            var yMax  = valueToBracket(bracket.max);
            var ySize = yMax - yMin;

            var xMin = _width - _bracketSize;
            var xMax = _width;

            var path =
                'M' + xMin + ',' + yMin +
                'Q' + xMax + ' ' + yMin + ',' + xMax + ' ' + (yMin + ySize * 0.025) +
                'v' + ySize * 0.95 +
                'Q' + xMax + ' ' + yMax + ',' + xMin + ' ' + yMax;

            if (_.has(_elements, 'bracketPath')) {
                _elements.bracketPath.attr({
                    visibility: visibility,
                    path:       path
                });

                _bracketTrans = bracket;
            }
            else {
                _elements.bracketPath = _canvas.path(path).attr({
                    visibility:         visibility,
                    fill:               _bracketColorBg,
                    strokeWidth:        1,
                    stroke:             _bracketColorFg,
                    'stroke-dasharray': '5, 1'
                });
            }

            if (_.has(_elements, 'bracketMin')) {
                _elements.bracketMin.attr({
                    visibility: visibility,
                    cy:         yMin
                });
            }
            else {
                _elements.bracketMin = _canvas.circle(
                    _width - _bracketSize,
                    yMin,
                    _anchorSize
                ).attr({
                    visibility: visibility,
                    fill:       _bracketColorPt
                });
            }

            if (_.has(_elements, 'bracketMax')) {
                _elements.bracketMax.attr({
                    visibility: visibility,
                    cy:         yMax
                });
            }
            else {
                _elements.bracketMax = _canvas.circle(
                    _width - _bracketSize,
                    yMax,
                    _anchorSize
                ).attr({
                    visibility: visibility,
                    fill:       _bracketColorPt
                });
            }
        }

        function updateMode() {
            if (_.has(_elements, 'mode')) {


            }
            else {
                _elements.mode = _canvas.text(
                    (_width - _bracketSize) / 2,
                    _height - _modeSize / 2,
                    'x'
                ).attr({
                    'dominant-baseline': 'middle',
                    'text-anchor':       'middle'
                }).click(modeClick);
            }
        }

        function updateDensity() {
            var fill = _fillColorBg;
            if (_data.hints.length > 0) {
                fill = _canvas.gradient(blendHints());
            }

            _elements.density.attr({fill: fill});
        }

        function blendHints() {
            var colorStops = 'l(0,0,0,1)';

            for (var i = 0, count = _data.hints.length; i < count; ++i) {
                var colorPercent = 0;
                if (_scale.length() > 0) {
                    colorPercent = Math.max(0, _data.hints[i].rating - _scale.min) / _scale.length();
                }

                var colorByte = 0xff - Math.min(0xff, Math.round(0xff * colorPercent));
                var colorObj  = tinycolor({r: colorByte, g: colorByte, b: colorByte});
                var colorStr  = colorObj.toHexString();

                colorStops += colorStr;
                if (i + 1 < count) {
                    colorStops += '-';
                }
            }

            return colorStops;
        }

        function updateState(value, mode) {
            _data.value = _range.clamp(value);
            _data.mode  = mode;

            if (_onStateChanged) {
                _onStateChanged(_name, _data.value, _data.mode);
            }

            animateIndicator(_valueTrans, _data.value);
        }

        function animateIndicator(valueOld, valueNew) {
            if (valueOld === valueNew) {
                return;
            }

            if (_indicatorAnim !== null) {
                _indicatorAnim.stop();
            }

            _indicatorAnim = Snap.animate(
                valueOld,
                valueNew,
                function(value) {
                    updateIndicator(value);
                },
                _easeTime,
                mina.easeinout,
                function() {
                    _indicatorAnim = null;
                }
            );
        }

        function animateBracket(bracketOld, bracketNew) {
            if (bracketOld.min === bracketNew.min && bracketOld.max === bracketNew.max) {
                return;
            }

            if (_bracketAnim !== null) {
                _bracketAnim.stop();
            }

            _bracketAnim = Snap.animate(
                [bracketOld.min, bracketOld.max],
                [bracketNew.min, bracketNew.max],
                function(bracket) {
                    updateBracket({min: bracket[0], max: bracket[1]});
                },
                _easeTime,
                mina.easeinout,
                function() {
                    _bracketAnim = null;
                }
            );
        }

        function valueColorAdjust(value, color, offset) {
            var colorObj = tinycolor(color);
            var rangeEnd = value >= 0.0 ? _range.max : _range.min;
            var rangeMid = (_range.min + _range.max) / 2.0;
            var rangeRat = (value - rangeMid) / (rangeEnd - rangeMid);
            var desatVal = Math.max(0.0, 1.0 - rangeRat + offset) * 100.0;
            return colorObj.desaturate(desatVal).toHexString();
        }

        function computeIndicatorColor(value) {
            var color = value >= 0.0 ? _fillColorPos : _fillColorNeg;
            return valueColorAdjust(value, color, _desatOffset);
        }

        function computeIndicatorRange(value) {
            return new Range(valueToIndicator(0.0), valueToIndicator(value));
        }

        function valueToControl(control, scalar) {
            var box    = control.getBBox();
            var offset = _range.offset(scalar);
            return box.y + box.height * (1.0 - offset);
        }

        function controlToValue(control, scalar) {
            var box   = control.getBBox();
            var range = new Range(box.y, box.y + box.height);
            return -_range.project(range.offset(scalar));
        }

        function valueToIndicator(scalar) {
            return valueToControl(_elements.indicatorBg, scalar);
        }

        function indicatorToValue(scalar) {
            return controlToValue(_elements.indicatorBg, scalar);
        }

        function valueToBracket(scalar) {
            return valueToControl(_elements.bracketBg, scalar);
        }

        function bracketToValue(scalar) {
            return controlToValue(_elements.bracketBg, scalar);
        }

        function indicatorClick(event, x, y) {
            var rect = _canvas.node.getBoundingClientRect();
            updateState(indicatorToValue(y - rect.top), _data.mode);
        }

        function modeClick(event, x, y) {
            alert('mode clicked');
        }

        this.update = function(data, scale) {
            _scale = scale;

            if (_.has(data, 'value')) {
                _data.value = data.value;
                animateIndicator(_valueTrans, _data.value);
            }
            if (_.has(data, 'hints')) {
                _data.hints = data.hints;
                updateDensity();
            }
            if (_.has(data, 'bracket')) {
                _data.bracket = data.bracket;
                animateBracket(_bracketTrans, _data.bracket);
            }
            if (_.has(data, 'mode')) {
                _data.mode = data.mode;
                updateMode();
            }
        };

        createShapes();
    }


    //
    //  Grapher
    //

    grapher.Grapher = function(params) {
        var _canvas         = params.canvas;
        var _columns        = {};
        var _data           = {};
        var _range          = new Range(-1.0, 1.0);
        var _useLocalScale  = params.useLocalScale || false;
        var _displayType    = params.displayType || 'density';
        var _onStateChanged = params.onStateChanged;

        function processHintParameters(columns) {
            var displayTypes = {compatibility: 'compatibility', density: 'count'};
            var statKey      = displayTypes[_displayType];

            for (var name in columns) {
                var column = columns[name];
                for (var i = 0, count = column.hints.length; i < count; ++i) {
                    column.hints[i].rating = column.hints[i][statKey];
                }
            }
        }

        function computeLocalScale(columnData) {
            var ratings = _.map(columnData.hints, function(hint) {
                return hint.rating;
            });

            return new Range(0, _.max(ratings));
        }

        function computeGlobalScale(columnsData) {
            var globalScale = null;
            for (var name in columnsData) {
                var localScale = computeLocalScale(columnsData[name]);
                if (globalScale) {
                    globalScale.include(localScale);
                }
                else {
                    globalScale = localScale;
                }
            }

            return globalScale;
        }

        this.setColumns = function(columnsData) {
            processHintParameters(columnsData);

            var scale = null;
            if (!_useLocalScale) {
                scale = computeGlobalScale(columnsData);
            }

            var index = 0;
            for (var name in columnsData) {
                var columnData = _data[name] = columnsData[name];
                if (_useLocalScale) {
                    scale = computeLocalScale(columnData);
                }

                var column = _columns[name];
                if (column) {
                    column.update(columnData, scale);
                }
                else {
                    _columns[name] = new Column({
                        onStateChanged: _onStateChanged,
                        range:          _range,
                        canvas:         _canvas,
                        data:           columnData,
                        name:           name,
                        scale:          scale,
                        index:          index++,
                    });
                }
            }
        };

        this.setUseLocalScale = function(useLocalScale) {
            if (useLocalScale != _useLocalScale) {
                _useLocalScale = useLocalScale;
                this.setColumns(_data);
            }
        };

        this.setDisplayType = function(displayType) {
            if (displayType != _displayType) {
                _displayType = displayType;
                this.setColumns(_data);
            }
        };
    };
}(window.grapher = window.grapher || {}));
