const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
module.exports = {
  entry: "./src/index.js", // 入口文件
  output: {
    path: path.resolve(__dirname, "dist"), // 打包后的输出路径
    filename: "bundle.js", // 打包后的输出文件名
  },
  target: "node", // 打包为Node.js可用的代码
  //   externals: [nodeExternals()], // 排除Node.js核心模块
  externals: {
    mysql: "commonjs",
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "assets", to: "assets" },
      ],
    }),
  ],
};
