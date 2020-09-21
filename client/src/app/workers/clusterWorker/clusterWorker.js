import { PWBWorker } from "promise-worker-bi";
import * as clustering from "../../clustering"

var promiseWorker = new PWBWorker();


promiseWorker.register((message) => {
    if (message.type === 'message') {
        const features = message.message.features;
        const minK = message.message.minK;
        const maxK = message.message.maxK;
        const tries = message.message.tries;
        const result = clustering.kMeansSearch(features, minK, maxK, tries);
        return result.idxs;
    }
});

