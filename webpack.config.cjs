const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const Dotenv = require("dotenv-webpack");
module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js", // 打包后的输出文件名
  },
  target: "node",
  //   externals: [nodeExternals()], // 排除Node.js核心模块
  externals: {
    mysql: "commonjs",
  },
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "assets", to: "assets" },
      ],
    }),
    new Dotenv({
      path: process.env.NODE_ENV === "production" ? "./.env.production" : "./.env", // 根据环境自动选择.env文件
      systemvars: true, // 允许读取系统环境变量
    }),
  ],
};
