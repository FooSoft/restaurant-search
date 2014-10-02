var gulp    = require('gulp');
var jshint  = require('gulp-jshint');
var nodemon = require('gulp-nodemon');

gulp.task('lint', function() {
    gulp.src(['*.js']).pipe(jshint());
});

gulp.task('develop', function() {
    return nodemon({ script: 'server.js', ext: 'js', port: 8000 }).on('change', ['lint']);
});

gulp.task('default', ['lint', 'develop']);
