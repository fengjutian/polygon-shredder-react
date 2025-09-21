const { override, overrideDevServer } = require('customize-cra');

module.exports = {
  webpack: override(
    // 这里可以添加webpack配置
  ),
  devServer: overrideDevServer(
    (config) => {
      // 设置开发服务器配置
      config.setupMiddlewares = (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }
        // 这里可以添加自定义中间件
        return middlewares;
      };
      return config;
    }
  )
};