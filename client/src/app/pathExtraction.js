import { path } from "d3";
import * as log from "../dev/log";
import Matrix from "./dataStructures/Matrix";
import { penalizeThreshold } from "./SSM";

export function extractPathFamily(ssm, sampleAmount, start, end) {
    const { D, width, height, score } = computeAccumulatedScoreMatrix(ssm, sampleAmount, start, end);
    const P = computeOptimalPathFamily(D, width, height);
}

export function computeAccumulatedScoreMatrix(ssm, sampleAmount, start, end, D) {
    if (start < 0) log.error("start below 0: ", start);
    if (end >= sampleAmount) log.error("end above sampleAmount: ", sampleAmount, "end", end);

    const length = end - start + 1;

    const width = length + 1;
    const height = sampleAmount;
    // accumulatedScoreMatrix length + 1 for elevator
    if (!D) {
        D = new Float32Array(height * width).fill(Number.NEGATIVE_INFINITY);
    }
    for (let i = 0; i < width + 1; i++) {
        D[i] = Number.NEGATIVE_INFINITY;
    }

    const penalty = -2;
    const penalize = (value) => {
        return value === 0 ? penalty : value;
    };

    D[0] = 0;
    D[1] = penalize(ssm.getValueNormalized(start, 0));

    for (let y = 1; y < height; y++) {
        D[y * width + 0] = Math.max(D[(y - 1) * width + 0], D[(y - 1) * width + width - 1]);
        D[y * width + 1] = D[y * width + 0] + penalize(ssm.getValueNormalized(start, y));
        for (let x = 2; x < width; x++) {
            const down = D[(y - 2) * width + x - 1] || Number.NEGATIVE_INFINITY; // in case undefined
            D[y * width + x] =
                penalize(ssm.getValueNormalized(start + x - 1, y)) +
                Math.max(D[(y - 1) * width + x - 1], D[(y - 1) * width + x - 2], down);
        }
    }

    const score = Math.max(D[(height - 1) * width + 0], D[(height - 1) * width + width - 1]);

    return { D, width, height, score };
}

export function computeOptimalPathFamily(D, width, height) {
    const pathFamily = [];
    let path = [];

    let y = height - 1;
    let x;
    if (D[y * width + width - 1] < D[y * width + 0]) {
        x = 0;
    } else {
        x = width - 1;
        path.push(x - 1, y);
    }

    // Declaring globally for improved running time
    let predecessors = new Uint16Array(6);
    let predecessorLength = 0; // in pairs, so max would be 3

    while (y > 0 || x > 0) {
        // obtaining the set of possible predecesors given our current position
        predecessors[0] = y - 1;
        predecessors[1] = x - 1;
        if (y <= 2 && x <= 2) {
            predecessorLength = 1;
        } else if (y <= 2 && x > 2) {
            predecessors[2] = y - 1;
            predecessors[3] = x - 2;
            predecessorLength = 2;
        } else if (y > 2 && x <= 2) {
            predecessors[2] = y - 2;
            predecessors[3] = x - 1;
            predecessorLength = 2;
        } else {
            predecessors[2] = y - 2;
            predecessors[3] = x - 1;
            predecessors[4] = y - 1;
            predecessors[5] = x - 2;
            predecessorLength = 3;
        }

        if (y === 0) {
            // case for the first row, only horizontal movements are allowed
            x--;
        } else if (x === 0) {
            // case for the elevator column: we can keep going down the column or jumping to the end of the next row
            if (D[(y - 1) * width + width - 1] > D[(y - 1) * width + 0]) {
                y--;
                x = width - 1;
                if (path.length > 0) {
                    pathFamily.push(path);
                }
                path = [x - 1, y];
            } else {
                y--;
                x = 0;
            }
        } else if (x === 1) {
            // case for x=1, only horizontal steps to the elevator column are allowed
            x = 0;
        } else {
            // regular case, obtain best of predecessors
            let max = Number.NEGATIVE_INFINITY;
            for (let i = 0; i < predecessorLength; i++) {
                const val = D[predecessors[i * 2 + 0] * width + predecessors[i * 2 + 1]]; // value in D of predecessor
                if (val > max) {
                    max = val;
                    y = predecessors[i * 2 + 0];
                    x = predecessors[i * 2 + 1];
                }
                path.push(x - 1, y);
            }
        }
    }
    // add last path to family
    pathFamily.push(path);
    return pathFamily;
}

export function computeFitness(pathFamily, score, sampleAmount, width) {
    const pathAmount = pathFamily.length;
    const error = 1e-16;

    // normalized score
    // we subtract the given self similarity path, and divide by total length of all paths (+ error to prevent divide by 0)
    let pathFamilyLength = 0;
    for (let p = 0; p < pathAmount; p++) {
        pathFamilyLength += pathFamily[p].length / 2; // /2 because we store x and y flat
    }
    const normalizedScore = Math.max(0, (score - width) / (pathFamilyLength + error));

    // normalized coverage
    const coverage = computeInducedCoverage(pathFamily);
    const normalizedCoverage = (coverage - width) / (sampleAmount + error);

    // fitness
    const fitness = (2 * normalizedScore * normalizedCoverage) / (normalizedScore + normalizedCoverage + error);

    return { fitness, normalizedScore, coverage, normalizedCoverage, pathFamilyLength };
}

export function computeInducedCoverage(pathFamily) {
    const pathAmount = pathFamily.length;
    let coverage = 0;
    if (pathAmount > 0) {
        for (let p = 0; p < pathAmount; p++) {
            // paths stored in reverse due to backtracking
            const pathEndY = pathFamily[p][1];
            const pathStartY = pathFamily[p][pathFamily[p].length - 1];
            coverage += Math.abs(pathEndY - pathStartY);
        }
    }

    return coverage;
}

export function getInducedSegments(pathFamily) {
    const pathAmount = pathFamily.length;
    const inducedSegments = new Uint16Array(pathAmount * 2);

    if (pathAmount > 0) {
        for (let p = 0; p < pathAmount; p++) {
            // paths stored in reverse due to backtracking
            const pathEndY = pathFamily[p][1];
            const pathStartY = pathFamily[p][pathFamily[p].length - 1];
            inducedSegments[p * 2] = pathStartY;
            inducedSegments[p * 2 + 1] = pathEndY;
        }
    }

    return inducedSegments;
}

export function visualizationMatrix(ssm, sampleAmount, start, end) {
    log.debug("start", start, "end", end);
    const { D, width, height, score } = computeAccumulatedScoreMatrix(ssm, sampleAmount, start, end);
    log.debug("SCORE: ", score);
    const P = computeOptimalPathFamily(D, width, height);
    const { fitness, normalizedScore, coverage, normalizedCoverage, pathFamilyLength } = computeFitness(
        P,
        score,
        sampleAmount,
        width
    );
    log.debug("normalizedScore: ", normalizedScore);
    log.debug("coverage: ", coverage);
    log.debug("normalizedCoverage: ", normalizedCoverage);
    log.debug("pathFamilyLength: ", pathFamilyLength);

    log.debug("FITNESS: ", fitness);

    let maxVal = Number.NEGATIVE_INFINITY;
    const sizeD = width * height;
    for (let i = 0; i < sizeD; i++) {
        if (D[i] > maxVal) {
            maxVal = D[i];
        }
    }

    const length = end - start + 1;
    const visualizationMatrix = new Matrix({
        width: length * 3,
        height: sampleAmount,
        numberType: Matrix.NumberType.UINT8,
    });

    visualizationMatrix.fill((x, y) => {
        if (x >= length * 2) {
            return 0; // Paths will be set from looping over paths
        } else if (x >= length) {
            return (Math.max(0, D[y * width + x - length + 1]) / maxVal) * 255; // +1 to remove elevator, * 255 sinze value is
        } else {
            return ssm.getValue(start + x, y);
        }
    });

    for (const path of P) {
        for (let i = 0; i < path.length / 2; i++) {
            const x = length * 2 - 1 + path[i * 2];
            const y = path[i * 2 + 1];
            visualizationMatrix.setValue(x, y, 255);
        }
    }

    return visualizationMatrix;
}

/**
 * Similar if they are aproximately repetitions of each other (overlap)
 * @param inducedSegmentsA in the form of a flat Uint16Array with pairs of start and end position of segments
 */
export function segmentDistance(inducedSegmentsA, inducedSegmentsB) {
    let maxSimilarity = 0;
    for (let a = 0; a < inducedSegmentsA.length; a += 2) {
        for (let b = 0; b < inducedSegmentsB.length; b += 2) {
            const startA = inducedSegmentsA[a];
            const endA = inducedSegmentsA[a + 1];
            const startB = inducedSegmentsB[b];
            const endB = inducedSegmentsB[b + 1];

            const disjoint = endA <= startB || endB <= startA;
            if (disjoint) continue;

            const smallestStart = Math.min(startA, startB);
            const largestEnd = Math.max(endA, endB);
            const union = largestEnd - smallestStart;

            const smallestEnd = Math.min(endA, endB);
            const largestStart = Math.max(startA, startB);
            const overlap = smallestEnd - largestStart;
            const similarity = overlap / union;

            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }
    }
    return 1 - maxSimilarity;
}
