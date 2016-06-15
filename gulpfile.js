/**
 * Created by zaccary.price on 22/06/2015.
 */

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var minifyHtml = require('gulp-minify-html');
var csso = require('gulp-csso');
var autoprefixer = require('gulp-autoprefixer');
var connect = require('gulp-connect');
var sass = require('gulp-sass');
var inject = require('gulp-inject');
var rev = require('gulp-rev');
var path = require('path');
var del = require('del');
var vinylPaths = require('vinyl-paths');
var wiredep = require('wiredep').stream;
var runSequence = require('run-sequence');
var useref = require('gulp-useref');
var gulpif = require('gulp-if');
var revReplace = require('gulp-rev-replace');


// configuration
var ports = {
  dev: 9090,
  dist: 9091
};

var paths = {
  src: 'src',
  dist: 'dist',
  tmp: '.tmp'
};

// clean <tmp> directory
gulp.task('clean:tmp', function () {
  return gulp.src(path.join(paths.tmp, '*'))
    .pipe(vinylPaths(del));
});

// clean <dist> directory
gulp.task('clean:dist', function () {
  return gulp.src(path.join(paths.dist, '*'))
    .pipe(vinylPaths(del));
});

// compile sass/scss files and run autoprefixer on processed css
gulp.task('sass', function () {
  return gulp.src([path.join(paths.src, 'styles/main.scss'), '!node_modules/**/*.scss'])
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(gulp.dest(path.join(paths.tmp, 'styles/')));
});


// inject javascript files into inject:js
// block in index.html
gulp.task('inject:js', function () {
  var target = gulp.src(path.join(paths.src, "index.html"));
  var sources = [path.join(paths.src, "scripts/**/*.js")];

  var opts = {
    transform: function (filePath) {
      filePath = filePath.replace('/' + paths.src + '/', '/');
      filePath = filePath.replace('/.tmp/', '/');
      return '<script src="' + filePath + '"></script>';
    }
  };

  return target
    .pipe(inject(gulp.src(sources), opts))
    .pipe(gulp.dest(path.join(paths.src, '/')));
});

// inject scss files into `// inject:scss` block in main.scss
gulp.task('inject:sass', function () {
  var target = gulp.src(path.join(paths.src, "/styles/main.scss"));
  var sources = [
    path.join(paths.src, "/styles/**/*.scss"),
    "!" + path.join(paths.src, "/styles/main.scss")
  ];

  var opts = {
    starttag: '// inject:{{ext}}',
    endtag: '// endinject',
    transform: function (filePath) {
      filePath = filePath.replace('/' + paths.src + '/styles/', '');
      filePath = filePath.replace(/([\w\/]*?)_?([\w\.\-]+?)\.(sass|scss)/, "$1$2");
      return '@import "' + filePath + '";';
    }
  };

  return target
    .pipe(inject(gulp.src(sources), opts))
    .pipe(gulp.dest(paths.src + '/styles'));
});

gulp.task('bower:html', function () {
  return gulp.src(path.join(paths.src, 'index.html'))
    .pipe(wiredep())
    .pipe(gulp.dest(paths.src));
});
gulp.task('bower:sass', function () {
  return gulp.src(path.join(paths.src, 'styles/main.scss'))
    .pipe(wiredep())
    .pipe(gulp.dest(path.join(paths.src, 'styles/')));
});

// watch for file changes and run injection and processing
gulp.task('watch', function () {
  gulp.watch('bower.json', ['bower:html', 'bower:sass']);
  gulp.watch(path.join(paths.src, 'scripts/**/*.js'), ['inject:js']);
  gulp.watch(path.join(paths.src, 'styles/**/*.scss'), ['inject:sass', 'sass']);
});

gulp.task('csso', function () {
  return gulp.src(path.join(paths.tmp, '**/*.css'))
    .pipe(csso())
    .pipe(gulp.dest(paths.tmp));
});

gulp.task('useref', function () {
  return gulp.src(paths.src + '/index.html')
    .pipe(useref())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', autoprefixer()))
    .pipe(gulpif('*.html', minifyHtml()))
    .pipe(gulp.dest(paths.tmp));
});

// run local server, connecting the <.tmp> routes
// to allow loading compiled files from <.tmp>
gulp.task('connect', function () {
  connect.server({
    root: [paths.src, paths.tmp],
    port: ports.dev
  });
});

// run local server with root at <dist>
// to emulate production server
gulp.task('connect:dist', function () {
  connect.server({
    root: paths.dist,
    port: ports.dist
  });
});

gulp.task("revision", ['csso'], function () {
  return gulp.src([path.join(paths.tmp, '**/*.css'), path.join(paths.tmp, '**/*.js')])
    .pipe(rev())
    .pipe(gulp.dest(paths.dist))
    .pipe(rev.manifest())
    .pipe(gulp.dest(paths.tmp))
});

gulp.task("revreplace", ["revision"], function () {
  var manifest = gulp.src("./" + paths.tmp + "/rev-manifest.json");

  return gulp.src(paths.tmp + "/index.html")
    .pipe(revReplace({ manifest: manifest }))
    .pipe(gulp.dest(paths.dist));
});

gulp.task('build', function (done) {
  runSequence(['clean:dist', 'clean:tmp'], ['inject:js', 'inject:sass'], 'sass', 'useref', 'revreplace', done)
});

gulp.task('serve', runSequence(['clean:dist', 'clean:tmp'], ['inject:js', 'inject:sass'], 'sass', 'connect', 'watch'));
gulp.task('serve:dist', runSequence('build', 'connect:dist'));
