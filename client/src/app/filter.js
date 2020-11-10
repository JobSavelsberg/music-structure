import * as log from "../dev/log";
import Matrix from "./dataStructures/Matrix";
import HalfMatrix from "./dataStructures/HalfMatrix";

function generate1DgaussianKernel(size, sigma = size) {
    const kernel = new Float32Array(size);
    const meanIndex = (size - 1) / 2;
    let sum = 0; // For accumulating the kernel values
    for (let x = 0; x < size; x++) {
        kernel[x] = Math.exp(-0.5 * Math.pow((x - meanIndex) / sigma, 2.0));
        // Accumulate the kernel values
        sum += kernel[x];
    }

    // Normalize the kernel
    for (let x = 0; x < size; x++) {
        kernel[x] /= sum;
    }
    return kernel;
}

export function gaussianBlur2DOptimized(matrix, size) {
    log.debug("Performing gaussian", size);
    const matrixSize = matrix.getSize();
    const fullKernelSize = size * 2 + 1;
    const kernel1D = generate1DgaussianKernel(fullKernelSize, size / 2);
    const blurredMatrix = Matrix.from(matrix);

    // Smear horizontal
    blurredMatrix.fill((x, y) => {
        let sum = 0;
        for (let kx = -size; kx <= size; kx++) {
            if (x + kx >= 0 && x + kx < matrixSize) {
                sum += matrix.getValueMirrored(x + kx, y) * kernel1D[kx + size];
            } else if (x + kx < 0) {
                sum += matrix.getValueMirrored(0, y) * kernel1D[kx + size];
            } else if (x + kx >= matrixSize) {
                sum += matrix.getValueMirrored(matrixSize - 1, y) * kernel1D[kx + size];
            }
        }
        return sum;
    });
    const blurredMatrixSecondPass = Matrix.from(matrix);

    // Smear vertical
    blurredMatrixSecondPass.fill((x, y) => {
        let sum = 0;
        for (let ky = -size; ky <= size; ky++) {
            if (y + ky >= 0 && y + ky < matrixSize) {
                sum += blurredMatrix.getValueMirrored(x, y + ky) * kernel1D[ky + size];
            } else if (y + ky < 0) {
                sum += blurredMatrix.getValueMirrored(x, 0) * kernel1D[ky + size];
            } else if (y + ky >= matrixSize) {
                sum += blurredMatrix.getValueMirrored(x, matrixSize - 1) * kernel1D[ky + size];
            }
        }
        return sum;
    });
    return blurredMatrixSecondPass;
}

export function gaussianBlur1D(array, size) {
    const fullKernelSize = size * 2 + 1;
    const kernel = generate1DgaussianKernel(fullKernelSize, size / 2);
    const blurredArray = new Float32Array(array.length);

    for (let i = 0; i < array.length; i++) {
        let sum = 0;
        for (let k = -size; k <= size; k++) {
            if (i + k >= 0 && i + k < array.length) {
                sum += array[i + k] * kernel[k + size];
            }
        }
        blurredArray[i] = sum;
    }

    return blurredArray;
}

export function medianBlur1DSegments() {}
