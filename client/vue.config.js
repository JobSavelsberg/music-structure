const Dotenv = require('dotenv-webpack');

module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  configureWebpack:{
    plugins: [
      new Dotenv()
    ]
  },
  chainWebpack: config => {
    config.output
      .globalObject('this')
    /* ... */
  }
}