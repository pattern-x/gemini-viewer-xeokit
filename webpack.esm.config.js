// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const TerserWebpackPlugin = require('terser-webpack-plugin');

const isProduction = process.env.NODE_ENV == "production";

const stylesHandler = "style-loader";

const config = {
  entry: {
    'gemini-viewer.esm': "./src/index.ts",
    // 'gemini-viewer.esm.min': './src/index.ts'
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: isProduction ? '[name].min.js' : '[name].js',
    // library: 'GeminiViewer',
    libraryTarget: 'module'
  },
  experiments: {
    outputModule: true
  },
  plugins: [
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        use: [{
          loader: 'ts-loader',
        }],
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
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserWebpackPlugin({
        include: /\.min/,
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      })
    ]
  }
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";
  } else {
    config.mode = "development";
  }
  return config;
};
