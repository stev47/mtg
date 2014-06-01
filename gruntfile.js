module.exports = function(grunt) {

  grunt.initConfig({
    sass: {
      dist: {
        files: {
          'public/css/style.css' : 'scss/style.scss'
        }
      }
    },
    watch: {
      source: {
        files: ['sass/*.scss'],
        tasks: ['sass'],
        options: {
          livereload: true,
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.registerTask('default', ['sass']);

};
