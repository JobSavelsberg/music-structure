const d3 = require("d3");
import * as audioUtil from "./audioUtil";

import * as log from "../dev/log";
import HalfMatrix from "./dataStructures/HalfMatrix";
import Matrix from "./dataStructures/Matrix";
import * as pathExtraction from "./pathExtraction";
import * as mds from "./mds";
import * as familyFitness from "./familyFitness";

export function create(fullSSM, sampleAmount, minSize, step) {
    log.debug("calculating scape plot");

    const plotSize = Math.floor((sampleAmount - minSize) / step);

    const fitnessScapePlot = new HalfMatrix({ size: plotSize, numberType: HalfMatrix.NumberType.FLOAT32 });

    const scoreMatrix = new Float32Array(sampleAmount * sampleAmount).fill(Number.NEGATIVE_INFINITY);

    let maxVal = 0;
    log.debug("SPCreate, sampleAmount", sampleAmount, "size", plotSize, "minSize", minSize, "step", step);
    fitnessScapePlot.fill((x, y) => {
        if (y < plotSize *0.4) {
            return 0;
        }
        const segmentSize = (plotSize - y) * step + minSize;
        const segmentStart = x * step;
        const { width, height, score } = pathExtraction.computeAccumulatedScoreMatrix(
            fullSSM,
            segmentStart,
            segmentStart + segmentSize - 1,
            scoreMatrix
        );
        const pathFamily = pathExtraction.computeOptimalPathFamily(scoreMatrix, width, height);
        const {
            fitness,
            normalizedScore,
            coverage,
            normalizedCoverage,
            pathFamilyLength,
        } = familyFitness.computeCustomPrunedFitness(pathFamily, null, score, sampleAmount, width);
        const val = fitness;
        if (val > maxVal) {
            maxVal = val;
        }
        return Math.max(0, val);
    });

    fitnessScapePlot.divide(maxVal);
    return fitnessScapePlot;
}

export function findLocalMaxima(scapePlot, maxAmount, minValue){

}

/**
* @param {*} scapePlot
 */
export function sampleAnchorPointsMax(scapePlot, maxAmount, minSpacing, minSize, minValue) {
    const maxY = scapePlot.size;
    const quant = 20;
    const indexMap = new Array(quant + 1);
    for (let i = 0; i < quant + 1; i++) {
        indexMap[i] = [];
    }
    const anchorPoints = new Uint16Array(maxAmount * 2);

    scapePlot.forEachCell((x, y, val) => {
        if (maxY - 1 - y >= minSize && val > minValue) {
            indexMap[Math.floor(val * quant) || 0].push(x, y);
        }
    });
    let anchorPointAmount = 0;
    let i = quant;
    while (anchorPointAmount < maxAmount) {
        while (indexMap[i].length <= 0) {
            i--;
            if (i < 0) {
                break;
            }
        }
        if (i < 0) break;
        const anchorPointY = indexMap[i].pop();
        const anchorPointX = indexMap[i].pop();
        anchorPoints[anchorPointAmount * 2] = anchorPointX;
        anchorPoints[anchorPointAmount * 2 + 1] = anchorPointY;
        anchorPointAmount++;

        for (let j = quant; j >= 0; j--) {
            for (let k = indexMap[j].length - 2; k >= 0; k -= 2) {
                const x = indexMap[j][k];
                const y = indexMap[j][k + 1];
                if (Math.sqrt(Math.pow(anchorPointX - x, 2) + Math.pow(anchorPointY - y, 2)) < minSpacing) {
                    indexMap[j].splice(k, 2);
                }
            }
        }
    }
    return { anchorPoints, anchorPointAmount };
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

/**
 *
 * @param {*} fullSSM
 * @param {*} sampleAmount
 * @param {*} minSize
 * @param {*} step
 * @param {*} anchorPoints
 * @param {*} anchorPointAmount
 * @returns a flat array with values (x, y, angle)
 */
export function mapColors(fullSSM, sampleAmount, minSize, step, anchorPoints, anchorPointAmount) {
    const plotSize = Math.floor((sampleAmount - minSize) / step);

    const segments = [];
    for (let i = 0; i < anchorPointAmount; i++) {
        const x = anchorPoints[i * 2];
        const y = anchorPoints[i * 2 + 1];

        const segmentSize = (plotSize - y) * step + minSize;
        const segmentStart = x * step;

        const segmentEnd = segmentStart + segmentSize;

        const startInSeconds = segmentStart * fullSSM.getSampleDuration();
        const endInSeconds = segmentEnd * fullSSM.getSampleDuration();
        segments.push({start: startInSeconds, end: endInSeconds});
    }

    const distanceMatrix = pathExtraction.getDistanceMatrix(segments, fullSSM);

    const MdsCoordinates = mds.getMdsCoordinatesWithGradientDescent(distanceMatrix);

    const anchorPointColor = new Float32Array(anchorPointAmount * 5);
    const thumbnailColor = 0.1;
    let angleOffset = 0;
    for (let i = 0; i < anchorPointAmount; i++) {
        const x = anchorPoints[i * 2];
        const y = anchorPoints[i * 2 + 1];
        anchorPointColor[i * 5] = x;
        anchorPointColor[i * 5 + 1] = y;
        anchorPointColor[i * 5 + 2] = MdsCoordinates[i][0];
        anchorPointColor[i * 5 + 3] = MdsCoordinates[i][1];
        let angle = Math.atan2(MdsCoordinates[i][1], MdsCoordinates[i][0]) / (2 * Math.PI) + angleOffset;
        angle = angle < 0 ? 1 + angle : angle;
        if (i === 0) {
            angleOffset = -angle;
            angle = 0;
        }
        anchorPointColor[i * 5 + 4] = angle + (thumbnailColor % 1);
    }

    return anchorPointColor;
}
