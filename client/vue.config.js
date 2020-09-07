const Dotenv = require('dotenv-webpack');

module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  configureWebpack:{
    plugins: [
      new Dotenv()
    ]
  }
}