const Dotenv = require("dotenv-webpack");
const WorkerPlugin = require("worker-plugin");

module.exports = {
    transpileDependencies: ["vuetify"],
    configureWebpack: {
        output: {
            globalObject: "this",
        },
        plugins: [new Dotenv(), new WorkerPlugin()],
    },
    chainWebpack: (config) => {
        config.output.globalObject("this");
        /* ... */
    },
};
