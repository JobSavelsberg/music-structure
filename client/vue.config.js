const Dotenv = require("dotenv-webpack");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const { path } = require("d3");

module.exports = {
    transpileDependencies: ["vuetify"],
    configureWebpack: {
        plugins: [
            new Dotenv(),
            new WasmPackPlugin({
                crateDirectory: __dirname + "/src/app/wasm", // Define where the root of the rust code is located (where the cargo.toml file is located)
            }),
        ],
    },
    chainWebpack: (config) => {
        config.output.globalObject("this");
        /* ... */
    },
};
