import { max } from "d3";
import * as log from "../dev/log";
import HalfMatrix from "./dataStructures/HalfMatrix";
import Matrix from "./dataStructures/Matrix";
import * as pathExtraction from "./pathExtraction";

export function create(fullSSM, sampleAmount, minSize, step) {
    log.debug("calculating scape plot");

    const plotSize = Math.floor((sampleAmount - minSize) / step);

    const fitnessScapePlot = new HalfMatrix({ size: plotSize, numberType: HalfMatrix.NumberType.FLOAT32 });

    let maxVal = 0;
    log.debug("SPCreate, sampleAmount", sampleAmount, "size", plotSize, "minSize", minSize, "step", step);
    fitnessScapePlot.fill((x, y) => {
        const segmentSize = (plotSize - y) * step + minSize;
        const segmentStart = x * step;
        const { D, width, height, score } = pathExtraction.computeAccumulatedScoreMatrix(
            fullSSM,
            sampleAmount,
            segmentStart,
            segmentStart + segmentSize - 1
        );
        const pathFamily = pathExtraction.computeOptimalPathFamily(D, width, height);
        const {
            fitness,
            normalizedScore,
            coverage,
            normalizedCoverage,
            pathFamilyLength,
        } = pathExtraction.computeFitness(pathFamily, score, sampleAmount, width);
        const val = fitness;
        if (val > maxVal) {
            maxVal = val;
        }
        return val;
    });

    fitnessScapePlot.divide(maxVal);
    return fitnessScapePlot;
}

/**
 * Not inmplemented
 * @param {*} scapePlot
 */
export function sampleAnchorPointsMax(scapePlot, maxAmount) {
    const frequencies = new Uint16Array(256).fill(0);
    const indexMap = new Array(256);
    for (let i = 0; i < 256; i++) {
        indexMap[i] = [];
    }
    const indexesSortedByFitness = new Uint16Array(scapePlot.length);

    scapePlot.forEach((val, index) => {
        indexMap[Math.floor(val * 255) || 0].push(index);
    });

    let pointsLeft = maxAmount;
    while (pointsLeft > 0) {
        for (let i = 255; i >= 0; i--) {
            const anchorPointIndex = indexMap[i].pop();
            scapePlot.forEach;
        }
    }

    log.debug(indexMap);
    const anchorPoints = [];
    throw Error("Not Implemented");
}

/**
 *
 * @param {*} scapePlot
 * @param {*} amount
 * @param {*} minValue
 * @param {*} minSize
 * @returns flat array of x and y index for points in scapeplot
 */
export function sampleAnchorPoints(scapePlot, amount, minValue, minSize) {
    let eligableCells = 0;
    const largestYValue = scapePlot.size - minSize;
    scapePlot.forEachCell((x, y, value) => {
        if (value > minValue && y < largestYValue) {
            eligableCells++;
        }
    });

    let stepSize = Math.floor(eligableCells / amount);

    const anchorPoints = new Uint16Array(amount * 2);
    let i = 0;
    let step = 0;
    log.debug("Eligable Cells", eligableCells);
    scapePlot.forEachCell((x, y, value) => {
        if (value > minValue && y < largestYValue) {
            if (step % stepSize === 0) {
                anchorPoints[i * 2] = x;
                anchorPoints[i * 2 + 1] = y;
                //log.debug(x, y);
                i++;
                scapePlot.setValue(x, y, 0);
            }
            step++;
        }
    });

    return anchorPoints;
}
