var concat     = require('gulp-concat');
var gulp       = require('gulp');
var inject     = require('gulp-inject');
var jshint     = require('gulp-jshint');
var minifyCss  = require('gulp-minify-css');
var sourcemaps = require('gulp-sourcemaps');
var uglify     = require('gulp-uglify');

var paths = {
    js: [
        './bower_components/underscore/underscore.js',
        './bower_components/handlebars/handlebars.js',
        './bower_components/jquery/dist/jquery.js',
        './bower_components/fabric/dist/fabric.js',
        './bower_components/tinycolor/tinycolor.js',
        './bower_components/bootstrap/dist/js/bootstrap.js',
        './bower_components/bootstrap-select/dist/js/bootstrap-select.js',
        './js/*.js'
    ],
    css: [
        './bower_components/bootstrap/dist/css/bootstrap.css',
        './bower_components/bootstrap/dist/css/bootstrap-theme.css',
        './bower_components/bootstrap-select/dist/css/bootstrap-select.css',
        './css/*.css'
    ],
    html: [
        './html/*.html'
    ]
};

gulp.task('lint', function() {
    return gulp.src('./js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('scripts', function() {
    return gulp.src(paths.js)
    .pipe(concat('scripts.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('styles', function() {
    return gulp.src(paths.css)
    .pipe(concat('styles.css'))
    .pipe(minifyCss())
    .pipe(gulp.dest('dist'));
});

gulp.task('pages', function() {
    var sources = gulp.src(paths.js.concat(paths.css), { read: false });
    return gulp.src(paths.html)
    .pipe(inject(sources))
    .pipe(gulp.dest('./'));
});

gulp.task('default', ['lint', 'scripts', 'styles', 'pages']);
