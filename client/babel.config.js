module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset',
    "@babel/preset-env"
  ],
  plugins: [
      ["@babel/transform-runtime"],
      ["@babel/plugin-proposal-class-properties"],
  ]
}
