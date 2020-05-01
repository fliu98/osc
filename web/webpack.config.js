const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: path.resolve(__dirname, 'src') + '/index.js',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    port: 3000,
    hot: true,
    publicPath: 'http://localhost3000/dist/',
    contentBase: path.join(__dirname, 'static')
  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
};