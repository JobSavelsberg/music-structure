import * as log from "../dev/log";
import asciichart from "asciichart";
/**
 * Convolve checkerboard kernel along main diagonal
 * @param {*} ssm half matrix
 */
export function detect(ssm, size) {
    const kernel = createKernel(size);
    const halfSize = Math.floor(size / 2);

    const novelty = new Float32Array(ssm.size);

    for (let i = 0; i < ssm.size; i++) {
        let kernelSum = 0;
        let cell = 0;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x <= y; x++) {
                const ssmX = i - (size - halfSize) + x;
                const ssmY = i - (size - halfSize + 1) + y;
                if (ssmX >= 0 && ssmX < ssm.size && ssmY >= 0 && ssmY < ssm.size) {
                    kernelSum += ssm.getValueNormalized(ssmX, ssmY) * kernel[cell];
                }
                cell++;
            }
        }
        novelty[i] = kernelSum;
    }
    return novelty;
}

function createKernel(size) {
    const kernelSize = (size * size + size) / 2;
    const kernel = new Float32Array(kernelSize).fill(0); // Don't need the diagonal itself
    /**   ▙
     *    ▒▒▙ subsize is the filled in size
     */
    const subSize = Math.floor(size / 2);
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
    const novelty = new Float32Array(timeLagMatrix.width);
    // sqrt of all distances
    for (let x = 0; x < timeLagMatrix.width; x++) {
        let differenceSum = 0;
        for (let y = 0; y < timeLagMatrix.height; y++) {
            const currentValue = timeLagMatrix.getValueNormalized(x, y);
            if (x < timeLagMatrix.width - 1) {
                const nextValue = timeLagMatrix.getValueNormalized(x + 1, y);
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
