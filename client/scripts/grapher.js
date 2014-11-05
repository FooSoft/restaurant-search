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

(function(grapher) {
    'use strict';

    //
    //  Coord
    //

    function Coord(x, y) {
        this.x = x;
        this.y = y;
    }


    //
    //  Rect
    //

    function Rect(left, top, width, height) {
        this.left   = left;
        this.top    = top;
        this.width  = width;
        this.height = height;
        this.right  = left + width;
        this.bottom = top + height;

        this.contains = function(coord) {
            var contained =
                coord.x >= this.left &&
                coord.x < this.right &&
                coord.y >= this.top &&
                coord.y < this.bottom;

            return contained;
        };

        this.intersection = function(rect) {
            var left   = Math.max(this.left, rect.left);
            var top    = Math.max(this.top, rect.top);
            var right  = Math.min(this.right, rect.right);
            var bottom = Math.min(this.bottom, rect.bottom);

            return new Rect(left, top, right - left, bottom - top);
        };
    }


    //
    //  Range
    //

    function Range(start, end) {
        this.start = Math.min(start, end);
        this.end   = Math.max(start, end);

        this.containsPoint = function(value) {
            return value >= this.start && value <= this.end;
        };

        this.length = function() {
            return this.end - this.start;
        };

        this.clamp = function(value) {
            if (value < this.start) {
                return this.start;
            }

            if (value > this.end) {
                return this.end;
            }

            return value;
        };

        this.include = function(range) {
            this.start = Math.min(this.start, range.start);
            this.end   = Math.max(this.end, range.end);
        };

        this.offset = function(value, clamp) {
            if (clamp) {
                value = this.clamp(value);
            }

            return (value - this.start) / this.length();
        };
    }


    //
    //  Column
    //

    function Column(params) {
        var _emptyColor     = '#eeeeec';
        var _strokeColor    = '#d3d7cf';
        var _tickColor      = '#888a85';
        var _fillColorNeg   = '#3465a4';
        var _fillColorPos   = '#cc0000';
        var _handleColorNeg = '#204a87';
        var _handleColorPos = '#a40000';

        var _desatOffset = -0.3;
        var _handleSize  = 10;
        var _densitySize = 10;
        var _panelSize   = 20;
        var _tickSize    = 5;
        var _width       = 125;
        var _height      = 500;
        var _padding     = 10;

        var _canvas   = params.canvas;
        var _name     = params.name;
        var _data     = params.data;
        var _scale    = params.scale;
        var _range    = params.range;
        var _steps    = params.steps;
        var _index    = params.index;
        var _elements = {};

        function createShapes() {
            _elements.gradient = _canvas.gradient(decimateHints());

            _elements.backdrop = _canvas.rect(
                _tickSize,
                0,
                _width - (_densitySize + _tickSize),
                _height - _panelSize
            ).attr({'stroke': '#d3d7cf', 'fill': '#eeeeec'});

            var range = computeIndicatorRange();
            _elements.indicator = _canvas.rect(
                _tickSize,
                range.start,
                _width - (_densitySize + _tickSize),
                range.end
            ).attr({'fill': computeFillColor()});

            _elements.density = _canvas.rect(
                _width - _densitySize,
                0,
                _densitySize,
                _height - _panelSize
            ).attr({'stroke': '#d3d7cf', 'fill': _elements.gradient});

            _elements.tick = _canvas.line(
                0,
                (_height - _panelSize) / 2,
                _tickSize,
                (_height - _panelSize) / 2
            ).attr({'stroke': '#888a85'});

            _elements.panel = _canvas.rect(
                _tickSize,
                _height - _panelSize,
                _width - _tickSize,
                _panelSize
            ).attr({'fill': '#d3d7cf'});

            _elements.label = _canvas.text(
                _tickSize + (_width - _tickSize) / 2,
                _height - _panelSize / 2,
                _name
            ).attr({'dominant-baseline': 'middle', 'text-anchor': 'middle'});

            _elements.group = _canvas.group(
                _elements.backdrop,
                _elements.indicator,
                _elements.density,
                _elements.panel,
                _elements.tick,
                _elements.label
            );

            _elements.group.transform(Snap.format('t{x},{y}', {x: _index * (_width + _padding), y: 0}));
        }

        function updateShapes() {

        }

        function decimateHints() {
            var colorStops = 'l(0,0,0,1)';

            var groups = groupHints();
            for (var i = 0, count = groups.length; i < count; ++i) {
                var groupSize = groups[i];

                var colorPercent = 0;
                if (_scale.length() > 0) {
                    colorPercent = Math.max(0, groupSize - _scale.start) / _scale.length();
                }

                var colorByte = 0xff - Math.min(0xff, Math.round(0xff * colorPercent));
                var colorObj  = tinycolor({ r: colorByte, g: colorByte, b: colorByte });
                var colorStr  = colorObj.toHexString();

                colorStops += colorStr;
                if (i + 1 < count) {
                    colorStops += '-';
                }
            }

            return colorStops;
        }

        function groupHints() {
            var stepSize = _range.length() / _steps;

            var hintGroups = [];
            for (var i = 0; i < _steps; ++i) {
                var stepMax = _range.end - stepSize * i;
                var stepMin = stepMax - stepSize;

                var hintCount = 0;
                for (var j = 0, count = _data.hints.length; j < count; ++j) {
                    var hint = _data.hints[j];
                    if (hint.sample > stepMin && hint.sample <= stepMax) {
                        hintCount += hint.count;
                    }
                }

                hintGroups.push(hintCount);
            }

            return hintGroups;
        }

        function setClampedValue(value, final) {
            _data.value = _range.clamp(value);

            if (final && onValueChanged) {
                onValueChanged(_name, _data.value);
            }

            updateShapes();
        }

        function valueColorAdjust(color, offset) {
            var colorObj = tinycolor(color);
            var rangeEnd = _data.value >= 0.0 ? _range.end : _range.start;
            var rangeMid = (_range.start + _range.end) / 2.0;
            var rangeRat = (_data.value - rangeMid) / (rangeEnd - rangeMid);
            var desatVal = Math.max(0.0, 1.0 - rangeRat + offset) * 100.0;
            return colorObj.desaturate(desatVal).toHexString();
        }

        function computeFillColor() {
            var color = _data.value >= 0.0 ? _fillColorPos : _fillColorNeg;
            return valueColorAdjust(color, _desatOffset);
        }

        function computeHandleColor() {
            var color = _data.value >= 0.0 ? _handleColorPos : _handleColorNeg;
            return valueColorAdjust(color, _desatOffset);
        }

        function computeIndicatorRange() {
            return new Range(valueToIndicator(0.0), valueToIndicator(_data.value));
        }

        function valueToIndicator(scalar) {
            var box    = _elements.backdrop.getBBox();
            var ratio  = box.height / _range.length();
            var offset = _range.offset(scalar, true);
            return box.y + box.height * (1.0 - offset);
        }

        this.update = function(data, scale) {
            _data  = data;
            _scale = scale;
            updateShapes();
        };

        createShapes();
    }


    //
    //  Grapher
    //

    grapher.Grapher = function(params) {
        var _canvas           = params.canvas;
        var _columns          = {};
        var _data             = {};
        var _range            = new Range(-1.0, 1.0);
        var _steps            = params.steps || 20;
        var _useLocalScale    = params.useLocalScale || true;
        var _useRelativeScale = params.useRelativeScale || true;
        var _onValueChanged   = params.onValueChanged;

        function computeLocalScale(hints) {
            var counts = _.pluck(hints, 'count');
            var min = _useRelativeScale ? _.min(counts) : 0;
            return new Range(min, _.max(counts));
        }

        function computeGlobalScale(hintData) {
            var globalScale = null;
            for (var i = 0, count = hintData.length; i < count; ++i) {
                var localScale = computeLocalScale(hintData[i]);
                if (globalScale) {
                    globalScale.include(localScale);
                }
                else {
                    globalScale = localScale;
                }
            }

            return globalScale;
        }

        this.setColumns = function(columns) {
            var scale = 0;
            if (!_useLocalScale) {
                var hintData = _.pluck(columns, 'hints');
                scale = computeGlobalScale(hintData);
            }

            var index = 0;
            for (var name in columns) {
                var data = _data[name] = columns[name];
                if (_useLocalScale) {
                    scale = computeLocalScale(data.hints);
                }

                var column = _columns[name];
                if (column) {
                    column.update(data, scale);
                }
                else {
                    _columns[name] = new Column({
                        onValueChanged: _onValueChanged,
                        steps:          _steps,
                        range:          _range,
                        canvas:         _canvas,
                        data:           data,
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

        this.setUseRelativeScale = function(useRelativeScale) {
            if (useRelativeScale != _useRelativeScale) {
                _useRelativeScale = useRelativeScale;
                this.setColumns(_data);
            }
        };
    };
}(window.grapher = window.grapher || {}));
