addEventListener("message", (event) => {
    console.log(event.data);
    console.log("Hi from clusterWorker");
});

/**
 *         const features = message.message.features;
        const minK = message.message.minK;
        const maxK = message.message.maxK;
        const tries = message.message.tries;
        const result = clustering.kMeansSearch(features, minK, maxK, tries);
        return result.idxs;
 */
