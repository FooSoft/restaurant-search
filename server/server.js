#!/usr/bin/env node

'use strict';

var express = require('express');
var search  = require('./db/search.js');


function main() {
    var app = express();

    app.use('/keywords', function(req, res) {
        console.log('Requesting keywords');
        res.json(search.getKeywords());
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
