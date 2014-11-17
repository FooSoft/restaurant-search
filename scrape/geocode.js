#!/usr/bin/env node

var geocoder = require('node-geocoder');
var jf       = require('jsonfile');
var _        = require('underscore');


function queryPosition(gc, address, cache, sequence, callback) {
    if (_.has(cache, address)) {
        console.log('Cache lookup success for:\n\t%s', address);
        callback(cache[address]);
        return sequence;
    }

    setTimeout(function() {
        gc.geocode(address, function(err, res) {
            if (err) {
                console.log('Geocode lookup fail for: \n\t%s', address);
                callback(null);
            }
            else {
                console.log('Geocode lookup success for: \n\t%s', address);
                callback(cache[address] = res[0]);
            }
        });
    }, sequence * 200);

    return sequence + 1;
}


function main() {
    var gc        = geocoder.getGeocoder('google', 'http', {});
    var srcData   = jf.readFileSync('data.json');
    var srcCount  = srcData.length;
    var cacheData = jf.readFileSync('cache/geo.json', {throws: false}) || {};
    var destData  = [];
    var sequence  = 0;

    _.each(srcData, function(srcItem) {
        sequence = queryPosition(gc, srcItem.address, cacheData, sequence, function(geo) {
            if (geo) {
                var destItem = _.clone(srcItem);
                destItem.geo = geo;
                destData.push(destItem);
            }

            if (--srcCount === 0) {
                jf.writeFileSync('data.json', destData);
                jf.writeFileSync('cache/geo.json', cacheData);
            }
        });
    });
}

if (require.main === module) {
    main();
}
