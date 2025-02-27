const path = require('path');
module.exports = {
  mode: 'development',
  entry: './web/webstart.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  devtool: 'inline-source-map',
  externals: {
    wabt: 'wabt'
  },
  resolve: {
    extensions: ['.ts']
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: 'webstart.js'
  }
};
