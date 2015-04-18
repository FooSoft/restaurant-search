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


//
// Setup
//

var conn = mysql.createConnection({host: 'localhost', user: 'hscd'});
conn.query('DROP DATABASE IF EXISTS hscd');
conn.query('CREATE DATABASE hscd');
conn.query('USE hscd');


//
// Reviews
//

conn.query('DROP TABLE IF EXISTS reviews');
conn.query('CREATE TABLE reviews(name VARCHAR(100) NOT NULL, url VARCHAR(200) NOT NULL, delicious FLOAT NOT NULL, accomodating FLOAT NOT NULL, affordable FLOAT NOT NULL, atmospheric FLOAT NOT NULL, latitude FLOAT NOT NULL, longitude FLOAT NOT NULL, distanceToStn FLOAT NOT NULL, closestStn VARCHAR(100) NOT NULL, accessCount INT NOT NULL, id INT NOT NULL AUTO_INCREMENT PRIMARY KEY) DEFAULT CHARACTER SET utf8');

for (var i = 0, count = data.length; i < count; ++i) {
    var record = data[i];
    conn.query('INSERT INTO reviews(name, url, delicious, accomodating, affordable, atmospheric, latitude, longitude, distanceToStn, closestStn, accessCount) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        record.name,
        record.relativeUrl,
        record.rating.food,
        record.rating.service,
        record.rating.value,
        record.rating.atmosphere,
        record.geo.latitude,
        record.geo.longitude,
        record.distanceToStn,
        record.closestStn,
        0
    ]);
}


//
// Categories
//

conn.query('DROP TABLE IF EXISTS categories');
conn.query('CREATE TABLE categories(description VARCHAR(200) NOT NULL, id INT NOT NULL AUTO_INCREMENT PRIMARY KEY)');

var categories = [
    'I prefer quiet places',
    'I enjoy Mexican Food',
    'I drive a car'
];

for (var i = 0, count = categories.length; i < count; ++i) {
    conn.query('INSERT INTO categories(description) VALUES (?)', [categories[i]]);
}


//
// History
//

conn.query('DROP TABLE IF EXISTS history');
conn.query('CREATE TABLE history(date DATETIME NOT NULL, reviewId INT NOT NULL, id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, FOREIGN KEY(reviewId) REFERENCES reviews(id))');


//
// HistoryGroup
//

conn.query('DROP TABLE IF EXISTS historyGroups');
conn.query('CREATE TABLE historyGroups(categoryId INT NOT NULL, categoryValue FLOAT NOT NULL, historyId INT NOT NULL, FOREIGN KEY(historyId) REFERENCES history(id), FOREIGN KEY(categoryId) REFERENCES categories(id))');


//
// Cleanup
//

conn.end();
