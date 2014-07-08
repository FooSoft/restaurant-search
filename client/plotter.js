'use strict';

goog.require('goog.color');
goog.require('goog.math');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Range');

function Plotter(canvas, useRelativeScale) {
    this.setRange = function(rangeX, rangeY) {
        this.rangeX = rangeX;
        this.rangeY = rangeY;
    }

    this.setData = function(data) {
        this.data = data;
    }

    this.setPosition = function(position) {
        this.position = position;
    }

    this.setUseRelativeScale = function(useRelativeScale) {
        this.useRelativeScale = useRelativeScale;
    }

    this.updateShapes = function() {
        var counts = _.pluck(this.data, 'count');
        var min    = this.useRelativeScale ? _.min(counts) : 0.0;
        var scale  = new goog.math.Range(min, _.max(counts));
        var index  = 0;

        for (var i = 0, count = this.data.length; i < count; ++i) {
            var value = this.data[i];

            var colorPercent = 0;
            if (scale.getLength() > 0) {
                colorPercent = Math.max(0, value.count - scale.start) / scale.getLength();
            }

            if (colorPercent < 0.01) {
                continue;
            }

            var colorByte = 0xff - Math.min(0xff, Math.round(0xff * colorPercent));
            var colorStr  = goog.color.rgbToHex(colorByte, colorByte, colorByte);

            var position = new goog.math.Coordinate(value.sampleX, value.sampleY);
            var marker   = null;

            if (this.dataMarkers.length <= index) {
                marker = this.addDataPoint(position, 10.0, colorStr);
                this.dataMarkers.push(marker);
            }
            else {
                marker = this.dataMarkers[index];
                marker.set(this.convertPosition(position));
                marker.set({ 'fill': colorStr });
            }

            ++index;
        };

        for (var i = index; i < this.dataMarkers.length; ++i) {
            this.canvas.remove(this.dataMarkers[i]);
        }
        this.dataMarkers.splice(index, this.dataMarkers.length);

        this.positionMarker.set(this.convertPosition(this.position));
        this.positionMarker.bringToFront();

        this.canvas.renderAll();
    }

    this.addDataPoint = function(position, radius, color) {
        var params = {
            'originX': 'center',
            'originY': 'center',
            'fill':    color,
            'radius':  radius
        };

        _.extend(params, this.convertPosition(position));

        var shape = new fabric.Circle(params);
        this.canvas.add(shape);

        return shape;
    }

    this.convertPosition = function(coordinate) {
        var percentX = (coordinate.x - this.rangeX.start) / this.rangeX.getLength();
        var percentY = (coordinate.y - this.rangeY.start) / this.rangeY.getLength();

        return {
            'left': percentX * this.canvas.width,
            'top':  (1 - percentY) * this.canvas.height
        };
    }

    this.setRange(new goog.math.Range(-1.0, 1.0), new goog.math.Range(-1.0, 1.0));
    this.setData([]);
    this.setPosition(new goog.math.Coordinate(0.0, 0.0));
    this.setUseRelativeScale(true);

    this.canvas         = new fabric.StaticCanvas(canvas);
    this.positionMarker = this.addDataPoint(this.position, 5.0, '#ef2929');
    this.dataMarkers    = [];
}
