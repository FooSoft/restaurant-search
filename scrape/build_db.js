#!/usr/bin/env node

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

var mysql = require('mysql');
var data  = require('./data.json');

var conn = mysql.createConnection({
    host:     'localhost',
    user:     'hscd',
    database: 'hscd'
});


//
// Reviews
//

conn.query('DROP TABLE IF EXISTS reviews');
conn.query('CREATE TABLE reviews(name VARCHAR(100) NOT NULL, url VARCHAR(200) NOT NULL, delicious FLOAT NOT NULL, accomodating FLOAT NOT NULL, affordable FLOAT NOT NULL, atmospheric FLOAT NOT NULL, latitude FLOAT NOT NULL, longitude FLOAT NOT NULL, distanceToStn FLOAT NOT NULL, closestStn VARCHAR(100) NOT NULL, id INT NOT NULL AUTO_INCREMENT PRIMARY KEY)');

for (var i = 0, count = data.length; i < count; ++i) {
    var record = data[i];
    conn.query('INSERT INTO reviews(name, url, delicious, accomodating, affordable, atmospheric, latitude, longitude, distanceToStn, closestStn) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        record.name,
        record.relativeUrl,
        record.rating.food,
        record.rating.service,
        record.rating.value,
        record.rating.atmosphere,
        record.geo.latitude,
        record.geo.longitude,
        record.distanceToStn,
        record.closestStn
    ]);
}


//
// Keywords
//

conn.query('DROP TABLE IF EXISTS keywords');
conn.query('CREATE TABLE keywords(name VARCHAR(50) NOT NULL, delicious FLOAT NOT NULL, accomodating FLOAT NOT NULL, affordable FLOAT NOT NULL, atmospheric FLOAT NOT NULL, nearby FLOAT NOT NULL, access FLOAT NOT NULL, PRIMARY KEY(name))');

var keywords = {
    delicious:     [1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    accommodating: [0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
    affordable:    [0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
    atmospheric:   [0.0, 0.0, 0.0, 1.0, 0.0, 0.0]
};

for (var keyword in keywords) {
    var record = keywords[keyword];
    conn.query('INSERT INTO keywords VALUES(?, ?, ?, ?, ?, ?, ?)', [keyword].concat(record));
}


//
// Presets
//

conn.query('DROP TABLE IF EXISTS presets');
conn.query('CREATE TABLE presets(name VARCHAR(50) NOT NULL, PRIMARY KEY(name))');

for (var keyword in keywords) {
    conn.query('INSERT INTO presets VALUES(?)', [keyword]);
}

conn.end();
