import TSNE from 'tsne-js';
import { PWBWorker } from "promise-worker-bi";

var promiseWorker = new PWBWorker();

let counter = 0;
let model = new TSNE({
    dim: 2,
    perplexity: 10.0,
    earlyExaggeration: 2.0,
    learningRate: 150.0,
    nIter: 400,
    metric: 'euclidean'
});
console.log("Created model")

promiseWorker.register((message) => {
    console.log(message);
    counter++;
    console.log(counter);
    if (message.type === 'message') {
        const features = message.message.features;
        

        model.on('progressStatus', (status) => {
            console.log(status);
        })
        // inputData is a nested array which can be converted into an ndarray
        // alternatively, it can be an array of coordinates (second argument should be specified as 'sparse')
        model.init({
            data: features,
            type: 'dense'
        });
        console.log("Initialized model")

        // `error`,  `iter`: final error and iteration number
        // note: computation-heavy action happens here
        console.log("Running model")

        let [error, iter] = model.run();
        console.log("Ran model")

        // rerun without re-calculating pairwise distances, etc.
        //let [error, iter] = model.rerun();
        
        // `output` is unpacked ndarray (regular nested javascript array)
        //let output = model.getOutput();
        
        // `outputScaled` is `output` scaled to a range of [-1, 1]
        let outputScaled = model.getOutputScaled();
        return outputScaled;
    }
});

