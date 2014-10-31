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
    }


    //
    //  Column
    //

    function Column(canvas, name, params, scale, range) {
        this.updateShapes = function(final) {

        };

        this.decimateHints = function(steps, scale) {
            var groups = this.groupHints(steps);

            var colorStops = {};
            _.each(groups, function(count, index) {
                var colorPercent = 0;
                if (scale.getLength() > 0) {
                    colorPercent = Math.max(0, count - scale.start) / scale.getLength();
                }

                var colorByte = 0xff - Math.min(0xff, Math.round(0xff * colorPercent));
                var colorObj  = tinycolor({ r: colorByte, g: colorByte, b: colorByte });
                var colorStr  = colorObj.toHexString();

                colorStops[index / steps] = colorStr;
            });

            return colorStops;
        };

        this.groupHints = function(steps) {
            var stepSize = this.range.getLength() / steps;

            var hintGroups = [];
            for (var i = 0; i < steps; ++i) {
                var stepMax = this.range.end - stepSize * i;
                var stepMin = stepMax - stepSize;

                var hintCount = 0;
                for (var j = 0, count = this.hints.length; j < count; ++j) {
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

        this.updateParams = function(params, scale) {
            this.hints = params.hints;
            this.value = params.value;
            this.steps = params.steps;
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

        this.getFillColor = function() {
            var color = this.value >= 0.0 ? this.fillColorPos : this.fillColorNeg;
            return this.valueColorAdjust(color, this.desatOffset);
        };

        this.getHandleColor = function() {
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

        this.canvas = canvas;
        this.shapes = [];
        this.name   = name;
        this.value  = params.value;
        this.hints  = params.hints;
        this.steps  = params.steps;
        this.scale  = scale;
        this.range  = range;
        this.bounds = bounds;
        this.state  = this.State.NORMAL;

        this.updateShapes(true);
    }


    //
    //  Grapher
    //

    grapher.Grapher = function(canvas, range, columnWidth, useLocalScale, useRelativeScale) {
        this.setColumns = function(columns) {
            this.clearColumns();

            var scale = 0;
            if (!useLocalScale) {
                var hintData = {};
                _.each(columns, function(columnValue, columnName) {
                    hintData[columnName] = columnValue.hints || [];
                });

                scale = this.getGlobalScale(hintData);
            }

            var index = 0;
            var that = this;
            _.each(columns, function(columnValue, columnName) {
                if (useLocalScale) {
                    scale = that.getLocalScale(columnValue.hints);
                }

                that.columns.push(new Column(that.canvas, columnName, columnValue, scale, that.range));
                that.indexMap[columnName] = index++;
            });
        };

        this.clearColumns = function() {
            _.each(this.columns, function(column) {
                column.clearShapes();
            });

            this.columns  = [];
            this.indexMap = {};
        };

        this.updateColumns = function(data) {
            var scale = 0;
            if (!this.useLocalScale) {
                scale = this.getGlobalScale(hintData);
            }

            var that = this;
            _.each(data, function(entry, name) {
                if (that.useLocalScale) {
                    scale = that.getLocalScale(entry.hints);
                }

                var index = that.getColumnIndex(name);
                var column = that.columns[index];
                column.updateParams(entry, scale);
            });
        };

        this.setUseLocalScale = function(useLocalScale) {
            if (useLocalScale != this.useLocalScale) {
                this.useLocalScale = useLocalScale;
                this.invalidateHints();
            }
        };

        this.setUseRelativeScale = function(useRelativeScale) {
            if (useRelativeScale != this.useRelativeScale) {
                this.useRelativeScale = useRelativeScale;
                this.invalidateHints();
            }
        };

        this.invalidateHints = function() {
            var hintData = {};
            _.each(this.columns, function(column) {
                hintData[column.name] = column.hints;
            });

            this.setColumnHints(hintData);
        };

        this.setValueChangedListener = function(listener) {
            _.each(this.columns, function(column) {
                column.onValueChanged = listener;
            });
        };

        this.getLocalScale = function(hints) {
            var counts = _.pluck(hints, 'count');
            var min = this.useRelativeScale ? _.min(counts) : 0;
            return new Range(min, _.max(counts));
        };

        this.getGlobalScale = function(hintData) {
            var that        = this;
            var globalScale = null;

            _.each(hintData, function(hints) {
                var localScale = that.getLocalScale(hints);
                if (globalScale) {
                    globalScale.includeRange(localScale);
                }
                else {
                    globalScale = localScale;
                }
            });

            return globalScale;
        };

        this.getColumnCount = function() {
            return this.columns.length;
        };

        this.getColumnIndex = function(name) {
            return this.indexMap[name];
        };

        this.getColumnName = function(index) {
            return this.columns[index].name;
        };

        this.getColumnNames = function() {
            return _.pluck(this.columns, 'name');
        };

        this.useLocalScale    = useLocalScale;
        this.useRelativeScale = useRelativeScale;
        this.columnWidth      = columnWidth;
        this.canvas           = null;
        this.range            = new Range(range.min, range.max);
        this.padding          = 10;
        this.indexMap         = {};
        this.columns          = [];
    };
}(window.grapher = window.grapher || {}));
