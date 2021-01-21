import * as log from "../../dev/log";
import * as structure from "../structure";
import * as SSM from "../SSM";
import * as filter from "../filter";
import * as events from "../events";
import * as noveltyDetection from "../noveltyDetection";

addEventListener("message", (event) => {
    const data = event.data;
    const ssmTimbre = SSM.calculateSSM(data.timbreFeatures, data.sampleDuration);
    const blurredTimbreLarge = filter.gaussianBlur2DOptimized(ssmTimbre, 3);
    const timbreNoveltyColumn = noveltyDetection.absoluteEuclideanColumnDerivative(blurredTimbreLarge);
    const smoothTimbreNoveltyColumn = filter.gaussianBlur1D(timbreNoveltyColumn, 3);
    const timbreSegments = structure.createSegmentsFromNovelty(smoothTimbreNoveltyColumn, data.sampleDuration, 0.2);
    const processedTimbreSegments = structure.processTimbreSegments(
        data.timbreFeatures,
        timbreSegments,
        data.sampleDuration
    );

    const smoothedTimbreFeatures = filter.gaussianBlurFeatures(data.timbreFeatures, 2);
    const eventArray = events.detectAverageWindow(smoothedTimbreFeatures, data.sampleDuration, 20, 0.2);

    postMessage({ timbreStructure: processedTimbreSegments, events: eventArray });
});
