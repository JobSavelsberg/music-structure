import * as log from "../../dev/log";
import * as structure from "../structure";
import * as SSM from "../SSM";
import * as filter from "../filter";
import * as noveltyDetection from "../noveltyDetection";

addEventListener("message", (event) => {
    const data = event.data;
    log.debug(data.timbreFeatures);
    const ssmTimbre = SSM.calculateSSM(data.timbreFeatures, data.sampleDuration);
    log.debug(ssmTimbre);
    const blurredTimbreLarge = filter.gaussianBlur2DOptimized(ssmTimbre, 8);
    const timbreNoveltyColumnLarge = noveltyDetection.absoluteEuclideanColumnDerivative(blurredTimbreLarge);
    const smoothTimbreNoveltyColumnLarge = filter.gaussianBlur1D(timbreNoveltyColumnLarge, 3);
    const timbreSegmentsLarge = structure.createSegmentsFromNovelty(
        smoothTimbreNoveltyColumnLarge,
        data.sampleDuration,
        0.2
    );
    const processedTimbreSegmentsLarge = structure.processTimbreSegments(
        data.timbreFeatures,
        timbreSegmentsLarge,
        data.sampleDuration
    );

    log.debug("Processed timbre segments large", processedTimbreSegmentsLarge);
    postMessage({ timbreStructure: processedTimbreSegmentsLarge });
});
