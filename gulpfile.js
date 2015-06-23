/**
 * Created by zaccary.price on 22/06/2015.
 */

var gulp			= require('gulp');
var usemin		= require('gulp-usemin');
var uglify			= require('gulp-uglify');
var minifyHtml	= require('gulp-minify-html');
var minifyCss		= require('gulp-minify-css');
var autoprefixer	= require('gulp-autoprefixer');
var connect		= require('gulp-connect');
var sass			= require('gulp-sass');
var inject			= require('gulp-inject');
var rev			= require('gulp-rev');
var path			= require('path');
var del			= require('del');
var vinylPaths		= require('vinyl-paths');

var paths = {
	src: 'src',
	dist: 'dist',
	tmp: '.tmp'
};

// clean <.tmp> directory
gulp.task('clean:tmp', function() {
	return gulp.src('.tmp/*')
		.pipe(vinylPaths(del));
});

// clean <dist> directory
gulp.task('clean:dist', function() {
	return gulp.src(path.join(paths.dist, '/*'))
		.pipe(vinylPaths(del));
});

// compile sass/scss files and run autoprefixer on processed css
gulp.task('sass', function() {
	gulp.src([path.join(paths.src, '/styles/main.scss'), '!node_modules/**/*.scss'])
		.pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer())
		.pipe(gulp.dest('.tmp/styles/'));
});


// inject javascript files into inject:js block
// in index.html
gulp.task('inject:js', function() {
	var target = gulp.src(path.join(paths.src, "/index.html"));
	var sources = [path.join(paths.src, "/scripts/**/*.js")];

	var opts = {
		read: false,
		transform: function(filePath) {
			filePath = filePath.replace('/' + paths.src + '/', '/');
			filePath = filePath.replace('/.tmp/', '/');
			return '<script src="' + filePath + '"></script>';
		}
	};

	target
		.pipe(inject(gulp.src(sources), opts))
		.pipe(gulp.dest(path.join(paths.src, '/')));
});

// inject scss files into `// inject:scss` block in
// main.scss
gulp.task('inject:sass', function() {
	var target = gulp.src([path.join(paths.src, "/styles/main.scss")]);
	var sources = [path.join(paths.src, "/styles/**/*.scss"), "!" + path.join(paths.src, "/styles/main.scss")];
	var opts = {
		read: false,
		starttag: '// inject:{{ext}}',
		endtag: '// endinject',
		transform: function (filePath) {
			filePath = filePath.replace('/' + paths.src + '/styles/', '');
			return '@import "' + filePath + '";';
		}
	};

	target
		.pipe(inject(gulp.src(sources), opts))
		.pipe(gulp.dest(paths.src + '/'));
});

// watch for file changes and run injection and processing
gulp.task('watch', function() {
	gulp.watch(path.join(paths.src, '/scripts/**/*.js'), ['inject:js']);
	gulp.watch(path.join(paths.src, '/styles/**/*.scss'), ['inject:sass', 'sass']);
});


// run concatenation, minification and reving
// using build blocks in index.html
// outputting resulting files to <dist>
gulp.task('usemin', function() {
	return gulp.src(path.join(paths.src, '/*.html'))
		.pipe(usemin({
			css: [autoprefixer(), minifyCss(), 'concat', rev()],
			html: [minifyHtml({empty: true})],
			js: [uglify(), rev()]
		}))
		.pipe(gulp.dest(paths.dist + '/'));
});


// run local server, connecting the <.tmp> routes
// to allow loading compiled files from <.tmp>
gulp.task('connect', function() {
	connect.server({
		root: [paths.src, paths.tmp],
		port: 9090
	});
});


gulp.task('serve', ['clean:tmp', 'inject:js', 'inject:sass', 'sass', 'connect']);

gulp.task('build', ['clean:dist', 'inject:js', 'inject:sass', 'sass', 'usemin']);