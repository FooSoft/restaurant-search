#!/usr/bin/env node

'use strict';

var express = require('express');
var search  = require('./db/search.js');


function main() {
    var app = express();

    search.loadDb({
        'host':     'localhost',
        'user':     'hscd',
        'database': 'hscd'
    });

    app.use('/keywords', function(req, res) {
        console.log('Requesting keywords');
        search.getKeywords(function(keywords) {
            res.json(keywords);
        });
    });

    app.use('/search', function(req, res) {
        console.log('Requesting search');
        console.log(req.query);
        res.json(search.execQuery(req.query));
    });

    app.listen(3000);
}

if (require.main === module) {
    main();
}
