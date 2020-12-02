module.exports = {
  presets: [
    ['@vue/cli-plugin-babel/preset'],
    ["@babel/preset-env", {"useBuiltIns": false}]
  ],
  plugins: [
    ["dynamic-import-node"],
    ["@babel/plugin-transform-runtime"],
    ["@babel/plugin-proposal-class-properties"],
  ]
}
