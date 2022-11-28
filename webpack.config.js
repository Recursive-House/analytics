const path = require("node:path");
const nodeExternals = require("webpack-node-externals");
const webpack = require("webpack");

const getDynConf = (target) => ({
  mode:
    process.env.NODE_ENV && process.env.NODE_ENV === "production"
      ? "production"
      : "development",
  module: {
    rules: [
      {
        test: /.[jt]s$/,
        exclude: /node_modules/,
        use: {
          loader: "swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript"
              }
            }
          }
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      BABEL_ENV: target === "esm" ? target : "cjs",
    }),
  ],

  resolve: {
    extensions: [".js", ".ts"],
    fallback: { "crypto": false },
  },
  externals:
    [
      nodeExternals({
        importType: target === "esm" ? "module" : target,
      }),
    ],
});

const entry = path.resolve(__dirname, "src/index.ts");
module.exports = [
  {
    entry,
    output: {
      path: path.resolve(__dirname, "dist/library/browser"),
      filename: "analytics.js",
      library: {
        name: "analytics",
        type: "var",
      },
    },
    ...getDynConf("umd"),
  },
  {
    entry,
    output: {
      path: path.resolve(__dirname, "dist/library/umd"),
      filename: "analytics.js",
      library: {
        name: "analytics",
        type: "umd",
      },
      globalObject: "this",
    },
    ...getDynConf("umd"),
  },
  {
    entry,
    experiments: {
      outputModule: true,
    },
    output: {
      path: path.resolve(__dirname, "dist/library/esm"),
      filename: "analytics.mjs",
      library: {
        type: "module",
      },
    },
    ...getDynConf("esm"),
  },
];