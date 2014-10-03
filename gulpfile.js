/*

   The MIT License (MIT)

   Copyright (c) 2014 Alex Yatskov

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.

*/

'use strict';

var concat         = require('gulp-concat');
var gulp           = require('gulp');
var inject         = require('gulp-inject');
var jshint         = require('gulp-jshint');
var mainBowerFiles = require('main-bower-files');
var minifyCss      = require('gulp-minify-css');
var minifyHtml     = require('gulp-minify-html');
var nodemon        = require('gulp-nodemon');
var path           = require('path');
var replace        = require('gulp-replace');
var uglify         = require('gulp-uglify');

function getBowerFiles(extension) {
    var allPaths = mainBowerFiles({paths: 'client'});

    var resultPaths = [];
    for (var i = 0, count = allPaths.length; i < count; ++i) {
        if (path.extname(allPaths[i]).toLowerCase() == extension) {
            resultPaths.push(allPaths[i]);
        }
    }

    return resultPaths;
}

gulp.task('lint', function() {
    var scripts = ['*.js', 'client/scripts/*.js', 'server/*.js'];
    gulp.src(scripts).pipe(jshint());
});

gulp.task('images', function() {
    return gulp.src('client/images/*').pipe(gulp.dest('client/dist/images'));
});

gulp.task('fonts', function() {
    return gulp.src('client/bower_components/bootstrap/fonts/*') .pipe(gulp.dest('client/dist/fonts'));
});

gulp.task('scripts', function() {
    var scripts = getBowerFiles('.js').concat(['client/scripts/*.js']);
    return gulp.src(scripts).pipe(concat('scripts.js')).pipe(uglify()).pipe(gulp.dest('client/dist'));
});

gulp.task('styles', function() {
    var styles = getBowerFiles('.css').concat(['client/styles/*.css']);
    return gulp.src(styles).pipe(replace('../fonts/', './fonts/')).pipe(concat('styles.css')).pipe(minifyCss()).pipe(gulp.dest('client/dist'));
});

gulp.task('html_dev', ['lint'], function() {
    var sources = gulp.src(getBowerFiles('.css').concat(getBowerFiles('.js')).concat(['client/scripts/*.js', 'client/styles/*.css']), {read: false});
    var target  = 'client/html/index.html';
    var options = {addRootSlash: false, ignorePath: 'client'};
    return gulp.src(target).pipe(inject(sources, options)).pipe(gulp.dest('client'));
});

gulp.task('html_dist', ['lint', 'fonts', 'images', 'scripts', 'styles'], function() {
    var sources = gulp.src(['client/dist/*.js', 'client/dist/*.css'], {read: false});
    var options = {addRootSlash: false, ignorePath: 'client/dist'};
    var target  = 'client/html/index.html';
    return gulp.src(target).pipe(inject(sources, options)).pipe(minifyHtml()).pipe(gulp.dest('client/dist'));
});

gulp.task('dev', ['html_dev'], function() {
    var options = {
        script: 'server/server.js',
        ext:    'js html',
        ignore: ['client/index.html'],
        args:   ['client']
    };

    return nodemon(options).on('change', ['html_dev']);
});

gulp.task('dist', ['html_dist'], function() {
    var options = {
        script: 'server/server.js',
        ext:    'js html css',
        ignore: ['client/dist/*'],
        args:   ['client/dist']
    };
    return nodemon(options).on('change', ['html_dist']);
});

gulp.task('default', ['dev']);
