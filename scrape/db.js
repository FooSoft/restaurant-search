#!/usr/bin/env node

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
conn.query('CREATE TABLE reviews(name VARCHAR(100) NOT NULL, url VARCHAR(200) NOT NULL, food FLOAT NOT NULL, service FLOAT NOT NULL, value FLOAT NOT NULL, atmosphere FLOAT NOT NULL)');

for (var i = 0, count = data.length; i < count; ++i) {
    var record = data[i];
    conn.query('INSERT INTO reviews VALUES(?, ?, ?, ?, ?, ?)', [
        record.name,
        record.relativeUrl,
        record.rating.food,
        record.rating.service,
        record.rating.value,
        record.rating.atmosphere
    ]);
}


//
// Keywords
//

conn.query('DROP TABLE IF EXISTS keywords');
conn.query('CREATE TABLE keywords(name VARCHAR(50) NOT NULL, food FLOAT NOT NULL, service FLOAT NOT NULL, value FLOAT NOT NULL, atmosphere FLOAT NOT NULL, PRIMARY KEY(name))');

var keywords = {
    'food':       [1.0, 0.0, 0.0, 0.0],
    'service':    [0.0, 1.0, 0.0, 0.0],
    'value':      [0.0, 0.0, 1.0, 0.0],
    'atmosphere': [0.0, 0.0, 0.0, 1.0]
};

for (var keyword in keywords) {
    var record = keywords[keyword];
    conn.query('INSERT INTO keywords VALUES(?, ?, ?, ?, ?)', [keyword].concat(record));
}

conn.end();
