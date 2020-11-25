import * as sim from "./similarity";
import * as audioUtil from "./audioUtil";
import * as log from "../dev/log";
import Matrix from "./dataStructures/Matrix";
import HalfMatrix from "./dataStructures/HalfMatrix";
import { NumberType } from "./dataStructures/NumberType";
import asciichart from "asciichart";
export function calculateSSM(features, sampleDuration, allPitches = false, threshold) {
    const ssm = new HalfMatrix({
        size: features.length,
        numberType: HalfMatrix.NumberType.UINT8,
        sampleDuration: sampleDuration,
        featureAmount: allPitches ? 12 : 1,
    });
    ssm.fillFeaturesNormalized(
        (x, y, f) => Math.max(0, sim.cosineTransposed(features[x], features[y], f) - threshold) / (1 - threshold)
    );
    return ssm;
}

/**
 * Diagonal smoothing of ssm, keeps paths but removes noise
 * @param {*} ssm
 * @param {*} options {`strategy`: choice of `onedir, linear, gauss, linmed`,`blurTime`: length in seconds, `blurLength`: length in samples, `tempoRatios`: array of ratios (e.g. [1.5] blurs paths that denote segment similarity with speed difference of 1.5)}
 */
export function enhanceSSM(ssm, options, allPitches = false) {
    const blurLength = options.blurLength || Math.round(options.blurTime / ssm.sampleDuration) || 4;
    const tempoRatios = options.tempoRatios || [1];
    const strategy = options.strategy || "linmed"

    const enhancementPasses = [];
    for (const tempoRatio of tempoRatios) {
        if(strategy === "onedir")enhancementPasses.push(onedirectionalSmoothing(ssm, 1, Math.floor(blurLength / 2), tempoRatio));
        if(strategy === "onedir")enhancementPasses.push(onedirectionalSmoothing(ssm, -1, Math.floor(blurLength / 2), tempoRatio));
        if(strategy === "linear")enhancementPasses.push(linearSmoothing(ssm, blurLength, tempoRatio));
        if(strategy === "gauss") enhancementPasses.push(gaussianSmoothing(ssm, blurLength, tempoRatio));
        if(strategy === "onedirmed")enhancementPasses.push(medianSmoothing( onedirectionalSmoothing(ssm, 1, Math.floor(blurLength / 2), tempoRatio), blurLength, tempoRatio));
        if(strategy === "onedirmed")enhancementPasses.push(medianSmoothing( onedirectionalSmoothing(ssm, -1, Math.floor(blurLength / 2), tempoRatio), blurLength, tempoRatio));
        if(strategy === "linmed")enhancementPasses.push(medianSmoothing( linearSmoothing(ssm, blurLength, tempoRatio), blurLength, tempoRatio));
        
    }

    const enhancedSSM = HalfMatrix.from(ssm);
    enhancedSSM.fillByIndex((i) => {
        let max = 0;
        for (const enhancementPass of enhancementPasses) {
            if (enhancementPass.data[i] > max) {
                max = enhancementPass.data[i];
            }
        }
        return max;
    });
    return enhancedSSM;
}

export function onedirectionalSmoothing(ssm, direction, length, tempoRatio) {
    log.debug("One Directional Smoothing: length", length, "tempoRatio", tempoRatio);

    const smoothedSSM = HalfMatrix.from(ssm);

    const tempos = new Int8Array(length);
    for (let i = 0; i < length; i++) {
        tempos[i] = Math.round(i * tempoRatio);
    }

    smoothedSSM.fillFeatures((x, y, f) => {
        let sum = 0;
        for (let i = 0; i !== direction * length; i += direction) {
            if (ssm.hasCell(x + i, y + direction * tempos[Math.abs(i)])) {
                sum += ssm.getValue(x + i, y + direction * tempos[Math.abs(i)], f);
            }
        }
        return sum / length;
    });
    return smoothedSSM;
}

function linearSmoothing(ssm, length, tempoRatio) {
    log.debug("Linear Smoothing: length", length, "tempoRatio", tempoRatio);

    const smoothedSSM = HalfMatrix.from(ssm);

    const blur = Math.round(length / 2); //Math.floor(length / 2);
    const total = Math.pow(blur + 1, 2);
    const tempos = new Int8Array(blur * 2 + 1);
    for (let i = -blur; i < 1 + blur; i++) {
        tempos[i + blur] = Math.round(i * tempoRatio);
    }

    smoothedSSM.fillFeatures((x, y, f) => {
        let sum = 0;
        for (let i = -blur; i < 1 + blur; i++) {
            if (ssm.hasCell(x + i, y + tempos[i + blur])) {
                sum += ssm.getValue(x + i, y + tempos[i + blur], f) * (blur + 1 - Math.abs(i));
            }
        }
        return sum / total;
    });
    return smoothedSSM;
}

function medianSmoothing(ssm, length, tempoRatio, resolution=128) {
    log.debug("Median Smoothing: length", length, "tempoRatio", tempoRatio);
    const buckets = new Float32Array(resolution);

    const l = Math.floor((length - 1) / 2);

    const tempos = new Int8Array(l * 2 + 1);
    for (let i = -l; i < 1 + l; i++) {
        tempos[i + l] = Math.round(i * tempoRatio);
    }
    const smoothedSSM = HalfMatrix.from(ssm);

    smoothedSSM.fillFeaturesNormalized((x, y, f) => {
        let totalValues = 0;
        for (let offset = -l; offset <= l; offset++) {
            if (ssm.hasCell(x + offset, y + tempos[offset + l])) {
                const value = ssm.getValueNormalized(x + offset, y + tempos[offset + l], f);
                buckets[Math.floor(value * (resolution - 1))]++;
                totalValues++;
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

    return smoothedSSM;
}

function gaussianSmoothing(ssm, length, tempoRatio) {
    log.debug("Gaussian Smoothing: length", length, "tempoRatio", tempoRatio);

    const smoothedSSM = HalfMatrix.from(ssm);

    const blur = Math.round(length / 2); //Math.floor(length / 2);
    const tempos = new Int8Array(blur * 2 + 1);
    const gaussianKernel = gauss(blur);
    log.debug(gaussianKernel);
    for (let i = -blur; i < 1 + blur; i++) {
        tempos[i + blur] = Math.round(i * tempoRatio);
    }

    smoothedSSM.fillFeatures((x, y, f) => {
        let sum = 0;
        for (let i = -blur; i < 1 + blur; i++) {
            if (ssm.hasCell(x + i, y + tempos[i + blur])) {
                sum += ssm.getValue(x + i, y + tempos[i + blur], f) * gaussianKernel[i + blur];
            }
        }
        return sum;
    });
    return smoothedSSM;
}

function gauss(blur, sigma = 2) {
    const gauss = new Float32Array(blur * 2 + 1);
    for (let i = -blur; i < 1 + blur; i++) {
        gauss[i + blur] = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(i, 2) / (2 * Math.pow(sigma, 2)));
    }
    return gauss;
}

export function makeTranspositionInvariant(ssm) {
    const lengthWithoutFeatures = ssm.length / ssm.featureAmount;
    const transpositionInvariantSSM = new HalfMatrix({ size: ssm.size, numberType: HalfMatrix.NumberType.UINT8, sampleDuration: ssm.sampleDuration });

    let i = 0;
    while (i < lengthWithoutFeatures) {
        let max = 0;
        for (let f = 0; f < ssm.featureAmount; f++) {
            if (ssm.data[i * ssm.featureAmount + f] > max) {
                max = ssm.data[i * ssm.featureAmount + f];
            }
        }
        transpositionInvariantSSM.data[i] = max;
        i++;
    }
    return transpositionInvariantSSM;
}

export function autoThreshold(ssm, percentage) {
    const typeScale = ssm.numberType.scale;
    let frequencies = new Uint16Array(typeScale + 1);
    ssm.forEach((cell) => {
        frequencies[cell]++;
    });

    let percentagePosition = ssm.length - ssm.length * percentage;
    let thresholdValue;
    for (let i = 0; i < typeScale + 1; i++) {
        percentagePosition -= frequencies[i];
        if (percentagePosition <= 0) {
            thresholdValue = i / typeScale;
            break;
        }
    }
    log.debug("Finding threshold with percentage", percentage, "got threshold: ", thresholdValue);
    let thresholdSSM;
    if (ssm instanceof Matrix) {
        thresholdSSM = Matrix.from(ssm);
    } else {
        thresholdSSM = HalfMatrix.from(ssm);
    }
    for (let i = 0; i < ssm.length; i++) {
        thresholdSSM.data[i] =
            Math.min(Math.max(ssm.data[i] / typeScale - thresholdValue, 0) / (1 - thresholdValue), 1) * typeScale;
    }
    return thresholdSSM;
}

export function rowColumnAutoThreshold(ssm, percentageRow, percentageCol = percentageRow) {
    log.debug("rowColumnAutoThreshold: row %:", percentageRow, "col %:", percentageCol);
    const typeScale = ssm.numberType.scale;

    const rowBinaryMatrix = new HalfMatrix({ size: ssm.size, numberType: NumberType.UINT8 });
    const colBinaryMatrix = new HalfMatrix({ size: ssm.size, numberType: NumberType.UINT8 });
    let frequencies = new Uint16Array(typeScale + 1);

    for (let row = 0; row < ssm.size; row++) {
        frequencies.fill(0);
        for (let col = 0; col < ssm.size; col++) {
            frequencies[ssm.getValueMirrored(col, row)]++;
        }
        let stopPosition = ssm.size * percentageRow;
        let thresholdValue = 0;
        for (let i = typeScale; i > 0; i--) {
            stopPosition -= frequencies[i];
            if (stopPosition <= 0) {
                thresholdValue = i;
                break;
            }
        }
        for (let col = 0; col <= row; col++) {
            if (ssm.getValue(col, row) >= thresholdValue) {
                rowBinaryMatrix.setValue(
                    col,
                    row,
                    Math.min(
                        (Math.max(ssm.getValue(col, row) - thresholdValue, 0) / (typeScale - thresholdValue)) *
                            typeScale,
                        typeScale
                    )
                );
            }
        }
    }

    for (let col = 0; col < ssm.size; col++) {
        frequencies.fill(0);
        for (let row = 0; row < ssm.size; row++) {
            frequencies[ssm.getValueMirrored(col, row)]++;
        }
        let stopPosition = ssm.size * percentageCol;
        let thresholdValue = 0;
        for (let i = typeScale; i > 0; i--) {
            stopPosition -= frequencies[i];
            if (stopPosition <= 0) {
                thresholdValue = i;
                break;
            }
        }

        for (let row = col; row <= ssm.size; row++) {
            if (ssm.getValue(col, row) >= thresholdValue) {
                colBinaryMatrix.setValue(
                    col,
                    row,
                    Math.min(
                        (Math.max(ssm.getValue(col, row) - thresholdValue, 0) / (typeScale - thresholdValue)) *
                            typeScale,
                        typeScale
                    )
                );
            }
        }
    }
    const thresholdSSM = HalfMatrix.from(ssm);
    thresholdSSM.fill((x, y) => {
        return (rowBinaryMatrix.getValue(x, y) + colBinaryMatrix.getValue(x, y)) / 2;
    });

    return thresholdSSM;
}

export function binarize(matrix, threshold = 0.5) {
    let binaryMatrix;
    if (matrix instanceof Matrix) {
        binaryMatrix = Matrix.from(matrix, { numberType: Matrix.NumberType.UINT8 });
    } else {
        binaryMatrix = HalfMatrix.from(matrix, { numberType: Matrix.NumberType.UINT8 });
    }
    binaryMatrix.fill((x, y) => {
        if (matrix.getValueNormalized(x, y) > threshold) {
            return 255;
        } else {
            return 0;
        }
    });

    return binaryMatrix;
}
