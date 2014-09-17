#!/usr/bin/env node

'use strict';

var _       = require('underscore');
var express = require('express');
var search  = require('./search.js');


function main() {
    var app = express();

    search.loadDb({
        'host':     'localhost',
        'user':     'hscd',
        'database': 'hscd'
    });

    app.use('/keywords', function(req, res) {
        search.getKeywords(function(keywords) {
            res.json(_.keys(keywords).sort());
        });
    });

    app.use('/search', function(req, res) {
        search.execQuery(req.query, function(results) {
            res.json(results);
        });
    });

    app.listen(3000);
}

if (require.main === module) {
    main();
}
