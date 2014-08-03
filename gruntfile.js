var path = require('path');

module.exports = function(grunt) {

  grunt.initConfig({
    sass: {
      dist: {
        /*files: [{
          expand: true,
          cwd: 'scss',
          src: ['*.scss'],
          dest: 'public/css',
          ext: '.css'
        }]
        */
        files: {}
      },
    },
    watch: {
      source: {
        files: ['scss/*.scss'],
        tasks: ['sass'],
        options: {
          livereload: true,
          spawn: false
        }
      }
    }
  });

  grunt.event.on('watch', function(action, filepath, target) {
    var dest = 'public/css/' + path.basename(filepath, '.scss') + '.css';
    grunt.config('sass.dist.files', (obj = {},
      obj['public/css/' + path.basename(filepath, '.scss') + '.css'] = 'scss/' + path.basename(filepath),
      obj
    ));
    grunt.log.writeln(grunt.config('sass.dist.files'));
    //grunt.log.writeln(target + ': ' + path.basename(filepath) + ' has ' + action);
  });

  grunt.registerTask('default', ['sass']);
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');

};
