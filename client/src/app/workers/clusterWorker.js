import * as log from "../../dev/log";
import * as clustering from "../clustering";

addEventListener("message", (event) => {
    log.debug("ClusterWorker", event);
    const features = event.data.features;
    const minK = event.data.minK;
    const maxK = event.data.maxK;
    const tries = event.data.tries;
    const result = clustering.kMeansSearch(features, minK, maxK, tries);
    postMessage(result.idxs);
});

/**
 *         const features = message.message.features;
        const minK = message.message.minK;
        const maxK = message.message.maxK;
        const tries = message.message.tries;
        const result = clustering.kMeansSearch(features, minK, maxK, tries);
        return result.idxs;
 */
