var concat         = require('gulp-concat');
var gulp           = require('gulp');
var jshint         = require('gulp-jshint');
var rename         = require('gulp-rename');
var sourcemaps     = require('gulp-sourcemaps');
var uglify         = require('gulp-uglify');
var mainBowerFiles = require('main-bower-files');

var paths = {
    js: [
        'bower_components/underscore/underscore.js',
        'bower_components/handlebars/handlebars.min.js',
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/fabric/dist/fabric.min.js',
        'bower_components/tinycolor/tinycolor.js',
        'bower_components/bootstrap/dist/js/bootstrap.min.js',
        'bower_components/bootstrap-select/dist/js/bootstrap-select.min.js',
        'js/*.js'
    ]
};


gulp.task('lint', function() {
    return gulp.src('js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('scripts', function() {
    return gulp.src(paths.js)
    .pipe(concat('all.js'))
    .pipe(gulp.dest('dist'))
    .pipe(rename('all.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['scripts']);
