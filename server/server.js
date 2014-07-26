#!/usr/bin/env node

var express  = require('express');
var keywords = require('./db/keywords.json');
var data     = require('./db/data.json');

function main() {
    var app     = express();
    var router  = express.Router();

    router.use('/keywords', function(req, res, next) {
        console.log('Requesting keywords');
        res.json(keywords);
    });

    app.use('/hscd', router);
    app.listen(3000);
}

if (require.main === module) {
    main();
}

