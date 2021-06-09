import * as filter from "./filter";
import Matrix from "./dataStructures/Matrix";
import assert from "assert";
import * as similarity from "./similarity";
import * as log from "../dev/log";

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

export function featureDerivative(features) {
    const derivative = new Float32Array(features.length);
    const zeroFeature = Array(features[0].length).fill(0);
    derivative[0] = 1 - similarity.euclidianTimbre(features[0], features[1]);
    for (let i = 1; i < features.length; i++) {
        derivative[i] = 1 - similarity.euclidianTimbre(features[i - 1], features[i]);
    }
    return derivative;
}

// Basically sums / averages in the direction of paths
export function computePriorLag(timeLagMatrix, fades = 0) {
    const ssmSize = timeLagMatrix.size || timeLagMatrix.width;
    const novelty = new Float32Array(ssmSize);
    for (let y = 0; y < ssmSize; y++) {
        for (let x = 0; x < ssmSize; x++) {
            novelty[y] += timeLagMatrix.getValueNormalizedMirrored(x, y);
        }
        novelty[y] /= ssmSize;
    }
    const fadedNovelty = filter.createFades(novelty, fades);
    return fadedNovelty;
}

// Basically sums / averages in the direction of paths
export function computePriorLagHalf(timeLagMatrix, fades = 0) {
    const ssmSize = timeLagMatrix.size || timeLagMatrix.width;
    const novelty = new Float32Array(ssmSize);
    for (let y = 0; y < ssmSize; y++) {
        for (let x = 0; x < ssmSize - y; x++) {
            novelty[y] += timeLagMatrix.getValueNormalizedMirrored(x, y);
        }
        novelty[y] /= ssmSize - y;
    }
    const fadedNovelty = filter.createFades(novelty, fades);
    return fadedNovelty;
}

export function findLocalMaxima(novelty, threshold = 0) {
    const max = Math.max.apply(Math, novelty);
    const maximaIndexes = [0];
    for (let i = 1; i < novelty.length - 1; i++) {
        const val = novelty[i];
        // prefers first index if maxima spans multiple samples
        if (novelty[i - 1] < val && val >= novelty[i + 1] && val > threshold * max) {
            maximaIndexes.push(i);
        }
    }
    return maximaIndexes;
}

export function findPeaks(novelty) {
    const peaks = [];
    peaks.push({ sample: 0, height: 0, confidence: 1 });
    const max = Math.max.apply(Math, novelty);

    const maxima = [];
    const minima = [];

    for (let i = 1; i < novelty.length - 1; i++) {
        const val = novelty[i];
        // prefers first index if maxima spans multiple samples
        if (novelty[i - 1] < val && val >= novelty[i + 1]) {
            maxima.push({ sample: i, height: val });
        }
        if (novelty[i - 1] > val && val <= novelty[i + 1]) {
            minima.push({ sample: i, height: val });
        }
    }

    for (let i = 0; i < maxima.length; i++) {
        const maxi = maxima[i];
        const leftMinima = i === 0 ? { sample: 0, height: 0 } : minima[i - 1];
        const rightMinima = i >= minima.length ? { sample: novelty.length - 1, height: 0 } : minima[i];
        let smallestMinima;
        if (leftMinima.height < rightMinima.height) {
            smallestMinima = leftMinima;
        } else {
            smallestMinima = rightMinima;
        }
        assert(smallestMinima, "No minima assigned as smallest");
        const maxPeakHeightDiff = maxi.height - smallestMinima.height;
        const confidence = maxPeakHeightDiff / max;
        peaks.push({ sample: maxi.sample, height: maxi.height, confidence });
    }
    return peaks;
}

export function columnDensity(matrix) {
    const ssmSize = matrix.size || matrix.width;
    const novelty = new Float32Array(ssmSize);
    for (let i = 0; i < ssmSize; i++) {
        novelty[i] = 0;
        for (let j = 0; j < ssmSize; j++) {
            novelty[i] += matrix.getValueNormalizedMirrored(i, j);
        }
        novelty[i] /= ssmSize;
    }
    return novelty;
}

export function normalizeByColumnDensity(matrix) {
    const ssmSize = matrix.size || matrix.width;
    const density = columnDensity(matrix);
    const normalizedMatrix = Matrix.from(matrix, { numberType: Matrix.NumberType.FLOAT32 });
    let max = 0;
    normalizedMatrix.fill((x, y) => {
        let colDensity = density[x];
        if (colDensity === 0) {
            colDensity = 1 / ssmSize;
        }
        const val = matrix.getValueNormalizedMirrored(x, y) / (ssmSize * colDensity);
        if (val > max) max = val;
        return val;
    });
    normalizedMatrix.divide(max);

    return normalizedMatrix;
}
