var concat     = require('gulp-concat');
var gulp       = require('gulp');
var inject     = require('gulp-inject');
var jshint     = require('gulp-jshint');
var minifyCss  = require('gulp-minify-css');
var minifyHtml = require('gulp-minify-html');
var replace    = require('gulp-replace');
var uglify     = require('gulp-uglify');

var paths = {
    scripts: [
        'bower_components/underscore/underscore.js',
        'bower_components/handlebars/handlebars.js',
        'bower_components/jquery/dist/jquery.js',
        'bower_components/fabric/dist/fabric.js',
        'bower_components/tinycolor/tinycolor.js',
        'bower_components/bootstrap/dist/js/bootstrap.js',
        'bower_components/bootstrap-select/dist/js/bootstrap-select.js',
        'scripts/*.js'
    ],
    styles: [
        'bower_components/bootstrap/dist/css/bootstrap.css',
        'bower_components/bootstrap/dist/css/bootstrap-theme.css',
        'bower_components/bootstrap-select/dist/css/bootstrap-select.css',
        'styles/*.css'
    ],
    fonts: [
        'bower_components/bootstrap/fonts/*'
    ],
    images: [
        'images/*'
    ],
    html: [
        'html/*.html'
    ]
};

gulp.task('lint', function() {
    return gulp.src('scripts/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('images', function() {
    return gulp.src(paths.images)
    .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', function() {
    return gulp.src(paths.fonts)
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('scripts', function() {
    return gulp.src(paths.scripts)
    .pipe(concat('scripts.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('styles', function() {
    return gulp.src(paths.styles)
    .pipe(replace('../fonts/', './fonts/'))
    .pipe(concat('styles.css'))
    .pipe(minifyCss())
    .pipe(gulp.dest('dist'));
});

gulp.task('html_debug', function() {
    var sources = gulp.src(paths.scripts.concat(paths.styles), { read: false });
    return gulp.src(paths.html)
    .pipe(replace('images/', '../images/'))
    .pipe(inject(sources, { addRootSlash: false, addPrefix: '..' }))
    .pipe(gulp.dest('dev'));
});

gulp.task('html_release', ['scripts', 'styles'], function() {
    var sources = gulp.src(['dist/*.js', 'dist/*.css'], { read: false });
    return gulp.src(paths.html)
    .pipe(inject(sources, { addRootSlash: false, ignorePath: 'dist' }))
    .pipe(minifyHtml())
    .pipe(gulp.dest('dist'));
});

gulp.task('watch_debug', function() {
    gulp.watch(paths.html, ['html_debug']);
    gulp.watch(paths.scripts, ['lint']);
});

gulp.task('debug',   ['lint', 'html_debug']);
gulp.task('release', ['lint', 'fonts', 'images', 'scripts', 'styles', 'html_release']);
gulp.task('all',     ['debug', 'release']);
gulp.task('default', ['debug', 'watch_debug']);
