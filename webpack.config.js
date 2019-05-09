'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  plugins: [
    new CopyPlugin([
      { from: 'public/css', to: 'css' },
      { from: 'public/index.html', to: 'index.html' },
    ]),
  ],
};
