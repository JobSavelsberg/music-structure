import * as log from "../dev/log";
import * as pathExtraction from "./pathExtraction";

export function create(pitchSSM, sampleAmount, minSize, step) {
    const time = performance.now();
    log.debug("calculating scape plot");

    const size = Math.ceil((sampleAmount - minSize) / step);

    const fitnessScapePlot = new Uint8Array((size * size + size) / 2);

    let currentCell = 0;
    log.debug("SPCreate, sampleAmount", sampleAmount, "minSize", minSize, "step", step);
    for (let size = minSize; size < sampleAmount; size += step) {
        for (let start = 0; start < sampleAmount - size; start += step) {
            const scoreMatrix = pathExtraction.calculateAccumulatedScoreMatrix(
                pitchSSM,
                sampleAmount,
                start,
                start + size
            );
            const { paths, normalizedScore, normalizedCoverage, fitness } = pathExtraction.backtracking(
                scoreMatrix,
                sampleAmount
            );

            fitnessScapePlot[currentCell] = Math.min(1, Math.max(0, fitness * 2.2)) * 255;
            currentCell++;
        }
    }
    log.debug("Currentcell SP ", currentCell);

    log.debug(fitnessScapePlot);
    log.debug("Done calculating scape plot in ", performance.now() - time);

    return fitnessScapePlot;
}
