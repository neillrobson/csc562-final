const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");

module.exports = {
  context: srcDir,
  entry: "./ts/index.ts",
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: ['ts-loader']
      },
      {
        test: /\.(glsl|vs|fs)$/,
        exclude: /node_modules/,
        use: ['raw-loader', 'glslify-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    path: distDir,
    filename: "bundle.js"
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Neill Robson: CSC 562 Fractal"
    })
  ],
  devServer: {
    contentBase: distDir
  },
  devtool: "source-map"
}