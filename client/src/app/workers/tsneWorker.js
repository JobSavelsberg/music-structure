import * as log from "../../dev/log";
addEventListener("message", (event) => {
    console.log(event.data);
    console.log("Hi from tsneWorker");
});

/**
 * import { PWBWorker } from "promise-worker-bi";
import tsneez from 'tsneez'

var promiseWorker = new PWBWorker();

// Hyper parameters
let opt = {}
opt.theta = 0.5 // theta
opt.perplexity = 20 // perplexity
const GRADIENT_STEPS = 400

let features = [];

var model = new tsneez.TSNEEZ(opt) // create a tsneez instance

promiseWorker.register((message) => {
    if (message.type === 'message') {
        features = message.message.features;
        model.initData(features)

        let prevTime = new Date();

        for (var k = 0; k < GRADIENT_STEPS; k++) {
            model.step() // gradient update
            //console.log(`Step : ${k}`)
            //check time passed
            let currTime = new Date();
            var timeDiff = currTime - prevTime; //in ms
            if (timeDiff > 1000) {
                promiseWorker.postMessage(getResult(model));
                prevTime = currTime;
            }
        }

        return getResult(model);
    }
});

function getResult(model) {
    var Y = model.Y

    let result = [];
    let max = 0;
    for (let i = 0; i < features.length; i++) {
        const x = Y.data[i * 2];
        const y = Y.data[i * 2 + 1];
        result.push([x, y]);

        max = Math.max(max, Math.abs(x), Math.abs(y));
    }

    // Scale to [-1,1]
    for (let i = 0; i < features.length; i++) {
        result[i][0] /= max;
        result[i][1] /= max;

    }

    return result;
}


 */
