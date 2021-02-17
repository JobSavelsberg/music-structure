import * as log from "../dev/log";
import Matrix from "./dataStructures/Matrix";
import HalfMatrix from "./dataStructures/HalfMatrix";

export function generate1DgaussianKernel(size, sigma = size / 2) {
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

export function generate1DlinearKernel(size) {
    const kernel = new Float32Array(size);
    const meanIndex = (size - 1) / 2;
    let sum = 0; // For accumulating the kernel values
    for (let x = 0; x < size; x++) {
        kernel[x] = 1 - Math.abs((x - meanIndex) / (size / 2));
        // Accumulate the kernel values
        sum += kernel[x];
    }

    // Normalize the kernel
    for (let x = 0; x < size; x++) {
        kernel[x] /= sum;
    }
    return kernel;
}

export function linearBlur2DOptimized(matrix, size) {
    log.debug("Performing 2D linear", size);
    const matrixSize = matrix.getSize();
    const fullKernelSize = size * 2 + 1;
    const kernel1D = generate1DlinearKernel(fullKernelSize);
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

export function gaussianBlur2DOptimized(matrix, size) {
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
export function gaussianBlurFeatures(features, size) {
    const blurredFeatures = [];
    const fullKernelSize = size * 2 + 1;
    const kernel = generate1DgaussianKernel(fullKernelSize, size / 2);
    const featureAmount = features[0].length;

    for (let i = 0; i < features.length; i++) {
        const newTimbre = new Float32Array(featureAmount);
        for (let f = 0; f < featureAmount; f++) {
            let sum = 0;
            for (let k = -size; k <= size; k++) {
                if (i + k >= 0 && i + k < features.length) {
                    sum += features[i + k][f] * kernel[k + size];
                }
            }
            newTimbre[f] = sum;
        }
        blurredFeatures.push(newTimbre);
    }

    return blurredFeatures;
}

export function gaussianBlur1D(array, size, edgeStrategy = "zeropad") {
    const fullKernelSize = size * 2 + 1;
    const kernel = generate1DgaussianKernel(fullKernelSize, size / 2);
    const blurredArray = new Float32Array(array.length);

    for (let i = 0; i < array.length; i++) {
        let sum = 0;
        for (let k = -size; k <= size; k++) {
            if (i + k >= 0 && i + k < array.length) {
                sum += array[i + k] * kernel[k + size];
            } else {
                switch (edgeStrategy) {
                    case "zeropad":
                        break;
                    case "mirror":
                        if (i - k >= 0 && i - k < array.length) {
                            sum += array[i - k] * kernel[k + size];
                        }
                        break;
                }
            }
        }
        blurredArray[i] = sum;
    }

    return blurredArray;
}

export function createFades(feature, padding) {
    for (let i = 0; i < feature.length; i++) {
        if (i < padding) {
            feature[i] *= i / padding;
        }
        if (i >= feature.length - padding) {
            feature[i] *= (feature.length - 1 - i) / padding;
        }
    }
    return feature;
}

export function maxFrequencyFilter(feature, resolution, size) {
    const buckets = new Int32Array(resolution);

    const blurredFeature = [];

    feature.forEach((val, i) => {
        for (let o = -size; o <= size; o++) {
            if (i + o >= 0 && i + o < feature.length) {
                buckets[feature[i + o]]++;
            }
        }

        let maxFrequency = -1;
        let maxValue = -1;
        for (let i = 0; i < resolution; i++) {
            if (buckets[i] > maxFrequency) {
                maxFrequency = buckets[i];
                maxValue = i;
            }
            buckets[i] = 0;
        }
        blurredFeature.push(maxValue);
    });

    return blurredFeature;
}

export function median2D(matrix, resolution, width, height) {
    const buckets = new Float32Array(resolution);

    const w = Math.floor((width - 1) / 2);
    const h = Math.floor((height - 1) / 2);

    const filteredMatrix = Matrix.from(matrix, { numberType: Matrix.NumberType.FLOAT32 });

    filteredMatrix.fill((x, y) => {
        let totalValues = 0;
        for (let xOffset = -w; xOffset <= w; xOffset++) {
            for (let yOffset = -h; yOffset <= h; yOffset++) {
                if (matrix.hasCell(x + xOffset, y + yOffset)) {
                    const value = matrix.getValueNormalized(x + xOffset, y + yOffset);
                    buckets[Math.floor(value * (resolution - 1))]++;
                    totalValues++;
                }
            }
        }
        let middle = totalValues / 2;

        //Both check middle and clear buckets
        let mean = -1;
        for (let i = 0; i < resolution; i++) {
            middle -= buckets[i];
            if (middle < 0 && mean === -1) {
                mean = i / (resolution - 1);
            }
            buckets[i] = 0;
        }
        return mean;
    });

    return filteredMatrix;
}
