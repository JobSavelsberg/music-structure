import * as log from "../dev/log";
import asciichart from "asciichart";
import { maxeqS } from "numeric";
/**
 * Convolve checkerboard kernel along main diagonal
 * @param {*} ssm half matrix
 */
export function detect(ssm, size) {
    const kernel = createKernel(size);
    const halfSize = Math.floor(size / 2);
    const ssmSize = ssm.size || ssm.width;
    const novelty = new Float32Array(ssmSize);
    for (let i = 0; i < ssmSize; i++) {
        let kernelSum = 0;
        let cell = 0;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x <= y; x++) {
                const ssmX = i - (size - halfSize) + x;
                const ssmY = i - (size - halfSize + 1) + y;
                if (ssmX >= 0 && ssmX < ssmSize && ssmY >= 0 && ssmY < ssmSize) {
                    kernelSum += ssm.getValueNormalizedMirrored(ssmX, ssmY) * kernel[cell];
                }
                cell++;
            }
        }
        novelty[i] = kernelSum;
    }
    return novelty;
}

export function createKernel(size) {
    const kernelSize = (size * size + size) / 2;
    const kernel = new Float32Array(kernelSize).fill(0); // Don't need the diagonal itself
    /**   ▙
     *    ▒▒▙ subsize is the filled in size
     */
    const subSize = size / 2;
    const taper = 2 / size;

    let cell = 0;
    let sum = 0;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x <= y; x++) {
            let sign;
            if (y >= subSize && x < size - subSize) {
                sign = -1;
            } else {
                sign = 1;
            }
            const gauss = Math.exp(
                -Math.pow(taper, 2) * (Math.pow(x - (size - subSize) + 0.5, 2) + Math.pow(y - subSize + 0.5, 2))
            );
            kernel[cell] = sign * gauss;
            sum += Math.abs(kernel[cell]);
            cell++;
        }
    }
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= sum;
    }

    return kernel;
}

export function computeNoveltyFromTimeLag(timeLagMatrix) {
    return absoluteEuclideanColumnDerivative(timeLagMatrix);
}

// Detects amount of change in ssm for column n and column n+1
export function absoluteEuclideanColumnDerivative(ssm) {
    const ssmSize = ssm.size || ssm.width;
    const novelty = new Float32Array(ssmSize);
    // sqrt of all distances
    for (let x = 0; x < ssmSize; x++) {
        let differenceSum = 0;
        for (let y = 0; y < ssmSize; y++) {
            const currentValue = ssm.getValueNormalizedMirrored(x, y);
            if (x < ssmSize - 1) {
                const nextValue = ssm.getValueNormalizedMirrored(x + 1, y);
                const difference = nextValue - currentValue;
                differenceSum += difference * difference;
            } else {
                differenceSum = novelty[x - 1] * novelty[x - 1]; // Last value just repeats the second to last
            }
        }
        novelty[x] = Math.sqrt(differenceSum);
    }
    return novelty;
}

export function findLocalMaxima(novelty) {
    const maximaIndexes = [0];
    for (let i = 1; i < novelty.length - 1; i++) {
        const val = novelty[i];
        // prefers first index if maxima spans multiple samples
        if (novelty[i - 1] < val && val >= novelty[i + 1]) {
            maximaIndexes.push(i);
        }
    }
    return maximaIndexes;
}
