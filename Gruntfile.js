/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = grunt => {
  grunt.initConfig({
    mochaTest: {
      options: {
        reporter: 'spec'
      },
      src: ['test/*.js']
    }});

  grunt.loadNpmTasks('grunt-mocha-test');

  return grunt.registerTask('default', ['mochaTest']);
};
