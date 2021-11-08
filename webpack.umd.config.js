// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
// const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserWebpackPlugin = require('terser-webpack-plugin');

const isProduction = process.env.NODE_ENV == "production";

const stylesHandler = "style-loader";

const config = {
  entry: {
    'gemini-viewer.umd': "./src/index.ts",
    // 'gemini-viewer.umd.min': './src/index.ts'
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: isProduction ? '[name].min.js' : '[name].js',
    library: 'GeminiViewer',
    libraryTarget: 'umd'
  },
  // experiments: {
  //   outputModule: true
  // },
  plugins: [
    // new HtmlWebpackPlugin({
    //   template: "index.html",
    // }),
    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        loader: "ts-loader",
        exclude: ["/node_modules/"],
      },
      {
        test: /\.css$/i,
        use: [stylesHandler, "css-loader"],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [stylesHandler, "css-loader", "sass-loader"],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: "asset",
      },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: [".tsx", ".ts", ".js"],
  },
  // devtool: 'source-map',
  // optimization: {
  //   minimize: true,
  //   minimizer: [
  //     new TerserWebpackPlugin({
  //       include: /\.min/
  //     })
  //   ]
  // }
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";
  } else {
    config.mode = "development";
  }
  return config;
};
