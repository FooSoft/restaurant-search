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
conn.query('CREATE TABLE reviews(name VARCHAR(100) NOT NULL, url VARCHAR(200) NOT NULL, delicious FLOAT NOT NULL, accomodating FLOAT NOT NULL, affordable FLOAT NOT NULL, atmospheric FLOAT NOT NULL, latitude FLOAT NOT NULL, longitude FLOAT NOT NULL, distanceToStation FLOAT NOT NULL, id INT NOT NULL AUTO_INCREMENT PRIMARY KEY)');

for (var i = 0, count = data.length; i < count; ++i) {
    var record = data[i];
    conn.query('INSERT INTO reviews(name, url, delicious, accomodating, affordable, atmospheric, latitude, longitude, distanceToStation) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        record.name,
        record.relativeUrl,
        record.rating.food,
        record.rating.service,
        record.rating.value,
        record.rating.atmosphere,
        record.geo.latitude,
        record.geo.longitude,
        record.distanceToStation
    ]);
}


//
// Keywords
//

conn.query('DROP TABLE IF EXISTS keywords');
conn.query('CREATE TABLE keywords(name VARCHAR(50) NOT NULL, delicious FLOAT NOT NULL, accomodating FLOAT NOT NULL, affordable FLOAT NOT NULL, atmospheric FLOAT NOT NULL, nearby FLOAT NOT NULL, PRIMARY KEY(name))');

var keywords = {
    delicious:     [1.0, 0.0, 0.0, 0.0, 0.0],
    accommodating: [0.0, 1.0, 0.0, 0.0, 0.0],
    affordable:    [0.0, 0.0, 1.0, 0.0, 0.0],
    atmospheric:   [0.0, 0.0, 0.0, 1.0, 0.0]
};

for (var keyword in keywords) {
    var record = keywords[keyword];
    conn.query('INSERT INTO keywords VALUES(?, ?, ?, ?, ?, ?)', [keyword].concat(record));
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
