const path = require('path');

module.exports = {
  entry: './src/index-simple.js',
  output: {
    path: path.resolve(__dirname, 'dist-simple'),
    filename: 'bundle.js',
    clean: true,
  },
  mode: 'production',
  resolve: {
    extensions: ['.js'],
  }
};
