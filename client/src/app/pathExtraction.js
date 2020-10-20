import { path } from "d3";
import * as log from "../dev/log";
import Matrix from "./dataStructures/Matrix";
import { penalizeThreshold } from "./SSM";

export function extractPathFamily(ssm, sampleAmount, start, end) {
    const { D, width, height, score } = computeAccumulatedScoreMatrix(ssm, sampleAmount, start, end);
    const P = computeOptimalPathFamily(D, width, height);
}

export function computeAccumulatedScoreMatrix(ssm, sampleAmount, start, end) {
    if (start < 0) log.error("start below 0: ", start);
    if (end >= sampleAmount) log.error("end above sampleAmount: ", sampleAmount, "end", end);

    const length = end - start + 1;

    const width = length + 1;
    const height = sampleAmount;
    // accumulatedScoreMatrix length + 1 for elevator
    const D = new Float32Array(height * width).fill(Number.NEGATIVE_INFINITY);

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
            const pathStartY = pathFamily[p][1];
            const pathEndY = pathFamily[p][pathFamily[p].length - 1];
            coverage += Math.abs(pathEndY - pathStartY);
        }
    }

    return coverage;
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

// OLD OLD OLD OLD

export function calculateAccumulatedScoreMatrix(ssm, sampleAmount, start, end) {
    const duration = end - start;
    const accumulatedMatrix = new Float32Array(sampleAmount * duration);

    accumulatedMatrix[0] = 0; // start of elevator is 0
    accumulatedMatrix[1] = ssm.data[1] / 255.0; // cell to the right of first elevator cell is score of that cell

    // Fill top with minus infinity (force to come from elevator)
    for (let x = 2; x < duration; x++) {
        accumulatedMatrix[x] = Number.NEGATIVE_INFINITY; //TODO: find way to make negative infinity
        accumulatedMatrix[1 * duration + x] = Number.NEGATIVE_INFINITY;
    }

    // Going from top left to bottom right, we have moves that go over 2 cells so we need to start at y and x =2
    for (let y = 1; y < sampleAmount; y++) {
        // find x = 0 (elevator) and x=1 (coming off the elevator) value
        const previousElevatorCell = accumulatedMatrix[(y - 1) * duration + 0];
        const closingPath = accumulatedMatrix[y * duration - 1];
        const newElevatorValue = Math.max(previousElevatorCell, closingPath);
        accumulatedMatrix[y * duration + 0] = newElevatorValue;
        let score = ssm.data[y * sampleAmount + 1] / 255.0;
        score = score === 0 ? -3 : score;

        accumulatedMatrix[y * duration + 1] = newElevatorValue + score;

        if (y >= 2) {
            for (let x = 2; x < duration; x++) {
                let score = ssm.data[y * sampleAmount + start + x] / 255.0;
                score = score === 0 ? -2 : score;
                const diag = accumulatedMatrix[(y - 1) * duration + x - 1];
                const left = accumulatedMatrix[(y - 1) * duration + x - 2]; // still diagonal, like a chess knight move
                const top = accumulatedMatrix[(y - 2) * duration + x - 1];

                accumulatedMatrix[y * duration + x] = score + Math.max(diag, left, top);
            }
        }
    }
    return accumulatedMatrix;
}

export function calculateAccumulatedScoreMatrixDiagonal(ssm, sampleAmount, start, end) {
    const duration = end - start;
    const accumulatedMatrix = new Float32Array(sampleAmount * duration);

    accumulatedMatrix[0] = 0; // start of elevator is 0
    accumulatedMatrix[1] = ssm.data[1] / 255.0; // cell to the right of first elevator cell is score of that cell

    // Fill top with minus infinity (force to come from elevator)
    for (let x = 2; x < duration; x++) {
        accumulatedMatrix[x] = Number.NEGATIVE_INFINITY; //TODO: find way to make negative infinity
        accumulatedMatrix[1 * duration + x] = Number.NEGATIVE_INFINITY;
    }

    // Going from top left to bottom right, we have moves that go over 2 cells so we need to start at y and x =2
    for (let y = 1; y < sampleAmount; y++) {
        // find x = 0 (elevator) and x=1 (coming off the elevator) value
        const previousElevatorCell = accumulatedMatrix[(y - 1) * duration + 0];
        const closingPath = accumulatedMatrix[y * duration - 1];
        const newElevatorValue = Math.max(previousElevatorCell, closingPath);
        accumulatedMatrix[y * duration + 0] = newElevatorValue;
        let score = ssm.data[y * sampleAmount + 1] / 255.0;
        score = score === 0 ? -3 : score;

        accumulatedMatrix[y * duration + 1] = newElevatorValue + score;

        if (y >= 2) {
            for (let x = 2; x < duration; x++) {
                let score = ssm.data[y * sampleAmount + start + x] / 255.0;
                score = score === 0 ? -2 : score;
                const diag = accumulatedMatrix[(y - 1) * duration + x - 1];

                accumulatedMatrix[y * duration + x] = score + diag;
            }
        }
    }
    return accumulatedMatrix;
}

export function backtracking(dtw, sampleAmount) {
    const duration = dtw.length / sampleAmount;
    const paths = [];

    let maxScore;
    let y = sampleAmount - 1; // All the way at the end of the track
    const elevatorEnd = dtw[(sampleAmount - 1) * duration];
    const endEnd = dtw[(sampleAmount - 1) * duration + duration];
    let x;
    if (endEnd > elevatorEnd) {
        x = duration - 1;
        paths.push([[x, y]]);
        maxScore = endEnd;
    } else {
        x = 0;
        maxScore = elevatorEnd;
    }

    while (y > 1) {
        if (x === 0) {
            // in elevator down
            y -= 1;

            // we can go down in elevator
            const downElevator = dtw[(y - 1) * duration + 0];
            // we can have path on opposite side
            const goOpposite = dtw[(y - 1) * duration + duration - 1];
            x = downElevator > goOpposite ? 0 : duration - 1;
            if (goOpposite > downElevator) {
                x = duration - 1;
                paths.push([[x, y]]);
            } else {
                x = 0;
            }
        } else {
            // take a normal backward step
            const diag = dtw[(y - 1) * duration + x - 1];
            const left = dtw[(y - 1) * duration + x - 2];
            const top = dtw[(y - 2) * duration + x - 1];
            if (left > diag && left > top) {
                y -= 1;
                x -= 2;
                paths[paths.length - 1].push([x, y]);
            } else if (top > diag && top > left) {
                y -= 2;
                x -= 1;
                paths[paths.length - 1].push([x, y]);
            } else {
                // go diagonally
                y -= 1;
                x -= 1;
                paths[paths.length - 1].push([x, y]);
            }
        }
    }
    const totalPathlength = paths.reduce((length, path) => length + path.length, 0);
    const normalizedScore = (maxScore - duration) / totalPathlength;

    let coverage = 0;
    paths.forEach((path) => {
        const pathStartY = path[0][1];
        const pathEndY = path[path.length - 1][1];
        coverage += Math.abs(pathEndY - pathStartY);
    });
    const normalizedCoverage = (coverage - duration) / sampleAmount;

    // harmonic mean
    const fitness = (2 * (normalizedScore * normalizedCoverage)) / (normalizedScore + normalizedCoverage);
    return { paths, normalizedScore, normalizedCoverage, fitness };
}

export function backtrackingDiagonal(dtw, sampleAmount) {
    const duration = dtw.length / sampleAmount;
    const paths = [];

    let maxScore;
    let y = sampleAmount - 1; // All the way at the end of the track
    const elevatorEnd = dtw[(sampleAmount - 1) * duration];
    const endEnd = dtw[(sampleAmount - 1) * duration + duration];
    let x;
    if (endEnd > elevatorEnd) {
        x = duration - 1;
        paths.push([[x, y]]);
        maxScore = endEnd;
    } else {
        x = 0;
        maxScore = elevatorEnd;
    }

    while (y > 1) {
        if (x === 0) {
            // in elevator down
            y -= 1;

            // we can go down in elevator
            const downElevator = dtw[(y - 1) * duration + 0];
            // we can have path on opposite side
            const goOpposite = dtw[(y - 1) * duration + duration - 1];
            x = downElevator > goOpposite ? 0 : duration - 1;
            if (goOpposite > downElevator) {
                x = duration - 1;
                paths.push([[x, y]]);
            } else {
                x = 0;
            }
        } else {
            // go diagonally
            y -= 1;
            x -= 1;
            paths[paths.length - 1].push([x, y]);
        }
    }
    const totalPathlength = paths.reduce((length, path) => length + path.length, 0);
    const normalizedScore = (maxScore - duration) / totalPathlength;

    let coverage = 0;
    paths.forEach((path) => {
        const pathStartY = path[0][1];
        const pathEndY = path[path.length - 1][1];
        coverage += Math.abs(pathEndY - pathStartY);
    });
    const normalizedCoverage = (coverage - duration) / sampleAmount;

    // harmonic mean
    const fitness = (2 * (normalizedScore * normalizedCoverage)) / (normalizedScore + normalizedCoverage);
    return { paths, normalizedScore, normalizedCoverage, fitness };
}

export function combine(pitchMatrix, scoreMatrix, paths, sampleAmount, start, end) {
    const duration = end - start;
    const combinedMatrix = new Float32Array(scoreMatrix.length * 3);
    for (let y = 0; y < sampleAmount; y++) {
        for (let x = 0; x < duration; x++) {
            combinedMatrix[y * duration * 3 + x] = (pitchMatrix[y * sampleAmount + start + x] / 255.0) * duration;
            combinedMatrix[y * duration * 3 + duration + x] = scoreMatrix[y * duration + x];
            combinedMatrix[y * duration * 3 + duration * 2 + x] = 0;
        }
    }
    paths.forEach((path) => {
        for (let i = 0; i < path.length; i++) {
            combinedMatrix[path[i][1] * duration * 3 + duration * 2 + path[i][0]] = 255;
        }
    });

    return combinedMatrix;
}
