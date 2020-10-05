const Dotenv = require("dotenv-webpack");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const path = require("path");
const WorkerPlugin = require("worker-plugin");

module.exports = {
    transpileDependencies: ["vuetify"],
    configureWebpack: {
        plugins: [
            new Dotenv(),
            new WorkerPlugin({ worker: false }),
            new WasmPackPlugin({
                crateDirectory: path.join(__dirname, "/src/app/wasm"), // Define where the root of the rust code is located (where the cargo.toml file is located)
            }),
        ],
    },
    chainWebpack: (config) => {
        config.output.globalObject("this");
        /* ... */
    },
};
