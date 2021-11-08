// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const TerserWebpackPlugin = require('terser-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

const isProduction = process.env.NODE_ENV == "production";

const stylesHandler = "style-loader";

const config = {
  devServer: {
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    static: {
      directory: path.join(__dirname, "/demo/public"),
    },
    port: 9000,
  },
  entry: {
    'gemini-viewer.esm': "./src/index.ts",
  },
  output: {
    path: path.resolve(__dirname, "/dist"),
    publicPath: "/dist/",
    filename: '[name].js',
    // library: 'GeminiViewer',
    libraryTarget: 'module'
  },
  experiments: {
    outputModule: true
  },
  plugins: [
    new ESLintPlugin({
      extensions: "ts",
    })
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: "combine.tsconfig.json"
          }
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
