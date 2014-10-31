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
        this.start = start;
        this.end   = end;

        this.containsPoint = function(value) {
            return value >= this.start && value <= this.end;
        };

        this.getLength = function() {
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
    }


    //
    //  Column
    //

    function Column(params) {
        this.updateShapes = function() {
            var gradient = this.canvas.gradient('l(0, 0, 0, 1)#000-#fff');

            this.canvas.rect(5, 0, 90, 490).attr({'stroke': '#d3d7cf', 'fill': '#eeeeec'});
            this.canvas.rect(5, 0, 90, 245).attr({'fill': '#cc0000'});
            this.canvas.rect(90, 0, 10, 490).attr({'stroke': '#d3d7cf', 'fill': gradient});
            this.canvas.rect(0, 490, 100, 20).attr({'fill': '#d3d7cf'});
            this.canvas.line(0, 245, 5, 245).attr({'stroke': '#888a85'});
            this.canvas.text(55, 500, this.name).attr({'dominant-baseline': 'middle', 'text-anchor': 'middle'});
        };

        this.decimateHints = function(hints, steps, scale) {
            var groups = this.groupHints(hints, steps);

            var colorStops = {};
            for (var i = 0, count = groups.length; i < count; ++i) {
                var groupSize = groups[i];

                var colorPercent = 0;
                if (scale.getLength() > 0) {
                    colorPercent = Math.max(0, groupSize - scale.start) / scale.getLength();
                }

                var colorByte = 0xff - Math.min(0xff, Math.round(0xff * colorPercent));
                var colorObj  = tinycolor({ r: colorByte, g: colorByte, b: colorByte });
                var colorStr  = colorObj.toHexString();

                colorStops[i / steps] = colorStr;
            }

            return colorStops;
        };

        this.groupHints = function(hints, steps) {
            var stepSize = this.range.getLength() / steps;

            var hintGroups = [];
            for (var i = 0; i < steps; ++i) {
                var stepMax = this.range.end - stepSize * i;
                var stepMin = stepMax - stepSize;

                var hintCount = 0;
                for (var j = 0, count = hints.length; j < count; ++j) {
                    var hint = this.hints[j];
                    if (hint.sample > stepMin && hint.sample <= stepMax) {
                        hintCount += hint.count;
                    }
                }

                hintGroups.push(hintCount);
            }

            return hintGroups;
        };

        this.setClampedValue = function(value, final) {
            this.value = this.range.clamp(value);
            this.updateShapes(final);

            if (this.onValueChanged && final) {
                this.onValueChanged(this.name, this.value);
            }
        };

        this.update = function(data, scale) {
            this.data  = data;
            this.scale = scale;
            this.updateShapes(true);
        };

        this.valueColorAdjust = function(color, offset) {
            var colorObj = tinycolor(color);
            var rangeEnd = this.value >= 0.0 ? this.range.end : this.range.start;
            var rangeMid = (this.range.start + this.range.end) / 2.0;
            var rangeRat = (this.value - rangeMid) / (rangeEnd - rangeMid);
            var desatVal = Math.max(0.0, 1.0 - rangeRat + offset) * 100.0;
            return colorObj.desaturate(desatVal).toHexString();
        };

        this.computeFillColor = function() {
            var color = this.value >= 0.0 ? this.fillColorPos : this.fillColorNeg;
            return this.valueColorAdjust(color, this.desatOffset);
        };

        this.computeHandleColor = function() {
            var color = this.value >= 0.0 ? this.handleColorPos : this.handleColorNeg;
            return this.valueColorAdjust(color, this.desatOffset);
        };

        this.State = {
            NORMAL: 0,
            HOVER:  1,
            DRAG:   2
        };

        this.handleSize     = 10;
        this.desatOffset    = -0.3;
        this.hintSize       = 10;
        this.labelFontSize  = 15;
        this.labelSize      = 20;
        this.tickLength     = 5;
        this.emptyColor     = '#eeeeec';
        this.strokeColor    = '#d3d7cf';
        this.tickColor      = '#888a85';
        this.fillColorNeg   = '#3465a4';
        this.fillColorPos   = '#cc0000';
        this.handleColorNeg = '#204a87';
        this.handleColorPos = '#a40000';

        this.canvas = params.canvas;
        this.name   = params.name;
        this.data   = params.data;
        this.scale  = params.scale;
        this.range  = params.range;
        this.state  = this.State.NORMAL;

        this.updateShapes();
    }


    //
    //  Grapher
    //

    grapher.Grapher = function(params) {
        this.setColumns = function(columns) {
            var scale = 0;
            if (!useLocalScale) {
                var hintData = _.pluck(columns, 'hints');
                scale = this.computeGlobalScale(hintData);
            }

            for (var name in columns) {
                var data = columns[name];
                if (useLocalScale) {
                    scale = this.computeLocalScale(data.hints);
                }

                var column = this.columns[name];
                if (column) {
                    column.update(data, scale);
                }
                else {
                    this.columns[name] = new Column({
                        canvas: this.canvas,
                        data:   column,
                        name:   name,
                        range:  this.range,
                        scale:  scale,
                    });
                }
            }
        };

        this.setUseLocalScale = function(useLocalScale) {
            if (useLocalScale != this.useLocalScale) {
                this.useLocalScale = useLocalScale;
                this.updateColumns(this.columnData);
            }
        };

        this.setUseRelativeScale = function(useRelativeScale) {
            if (useRelativeScale != this.useRelativeScale) {
                this.useRelativeScale = useRelativeScale;
                this.updateColumns(this.columnData);
            }
        };

        this.setValueChangedListener = function(listener) {
            for (var name in this.columns) {
                this.columns[name].onValueChanged = listener;
            }
        };

        this.computeLocalScale = function(hints) {
            var counts = _.pluck(hints, 'count');
            var min = this.useRelativeScale ? _.min(counts) : 0;
            return new Range(min, _.max(counts));
        };

        this.computeGlobalScale = function(hintData) {
            var globalScale = null;
            for (var i = 0, count = hintData.length; i < count; ++i) {
                var localScale = this.computeLocalScale(hintData[i]);
                if (globalScale) {
                    globalScale.include(localScale);
                }
                else {
                    globalScale = localScale;
                }
            }

            return globalScale;
        };

        this.canvas           = params.canvas;
        this.columnData       = null;
        this.columnPadding    = params.columnPadding || 10;
        this.columnRange      = new Range(-1.0, 1.0);
        this.columnWidth      = params.columnWidth || 100;
        this.columns          = {};
        this.useLocalScale    = params.useLocalScale || true;
        this.useRelativeScale = params.useRelativeScale || true;
    };
}(window.grapher = window.grapher || {}));
