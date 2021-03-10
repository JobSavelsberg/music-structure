import * as log from "../../dev/log";
addEventListener("message", (event) => {
    log.debug(event.data);
});

/**
 *         const features = message.message.features;
        const minK = message.message.minK;
        const maxK = message.message.maxK;
        const tries = message.message.tries;
        const result = clustering.kMeansSearch(features, minK, maxK, tries);
        return result.idxs;
 */
