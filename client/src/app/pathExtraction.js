import { path } from "d3";
import * as log from "../dev/log";

export function calculateAccumulatedScoreMatrix(ssm, sampleAmount, start, end) {
    const duration = end - start;
    const accumulatedMatrix = new Float32Array(sampleAmount * duration);

    accumulatedMatrix[0] = 0; // start of elevator is 0
    accumulatedMatrix[1] = ssm[1] / 255.0; // cell to the right of first elevator cell is score of that cell

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
        let score = ssm[y * sampleAmount + 1] / 255.0;
        score = score === 0 ? -3 : score;

        accumulatedMatrix[y * duration + 1] = newElevatorValue + score;

        if (y >= 2) {
            for (let x = 2; x < duration; x++) {
                let score = ssm[y * sampleAmount + start + x] / 255.0;
                score = score === 0 ? -2 : score;
                const diag = accumulatedMatrix[(y - 1) * duration + x - 1];
                const left = accumulatedMatrix[(y - 1) * duration + x - 2]; // still diagonal, like a chess knight move
                const top = accumulatedMatrix[(y - 2) * duration + x - 1];

                accumulatedMatrix[y * duration + x] = score + Math.max(diag, left, top);
            }
        }
    }

    // Find smallest path by backtracking
    // if x or y is 1 go back to start
    // else take argmin of best scoring value
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
