const { overrideDevServer } = require('customize-cra');

module.exports = {
  devServer: overrideDevServer(
    (config) => {
      // 使用新的setupMiddlewares选项代替已弃用的选项
      config.setupMiddlewares = (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }

        // 在这里添加您的中间件
        // 例如：devServer.app.use('/api', myApiMiddleware);

        // 必须返回中间件数组
        return middlewares;
      };
      
      return config;
    }
  )
};