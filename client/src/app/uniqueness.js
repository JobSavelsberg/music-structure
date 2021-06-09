import * as similarity from "./similarity";
import * as noveltyDetection from "./noveltyDetection";
import * as filter from "./filter";
import * as SSM from "./SSM";
import multivariate_gaussian_fit from "expectation-maximization";
import * as GMM from "gaussian-mixture-model";
import * as log from "../dev/log";

export function computeFromSSM(ssm) {
    const size = ssm.getSize();
    const uniquenessFeature = [];
    for (let col = 0; col < size; col++) {
        let sum = 0;
        for (let row = 0; row < size; row++) {
            sum += ssm.getValueNormalizedMirrored(col, row);
        }
        sum--;
        uniquenessFeature.push(1 - sum / size);
    }
    return uniquenessFeature;
}

export function computeFromFeatures(features, sampleDuration, windowSizeSeconds) {
    const uniquenessFeature = [];
    const averagedFeature = computeAveragedFeature(features, sampleDuration, windowSizeSeconds);

    for (let i = 0; i < features.length; i++) {
        const uniqueness = (1 - similarity.euclidianTimbre(averagedFeature[i], features[i])) / 2;
        const absFeature = features[i].map((val) => Math.abs(val));
        const energy = absFeature.reduce((sum, val) => sum + val);
        uniquenessFeature.push(energy * uniqueness);
    }
    return uniquenessFeature;
}
export function computeAveragedFeature(features, sampleDuration, windowSizeSeconds, padding = "mirror") {
    const halfWindowSizeSamples = Math.round(windowSizeSeconds / 2 / sampleDuration);
    const featureSize = features[0].length;

    const gaussianKernel = filter.generate1DgaussianKernel(halfWindowSizeSamples * 2);
    const sum = gaussianKernel.reduce((sum, val) => (sum += val));

    const averagedFeature = [];

    for (let i = 0; i < features.length; i++) {
        const averageTimbre = new Float32Array(featureSize).fill(0);
        for (let o = -halfWindowSizeSamples; o <= halfWindowSizeSamples; o++) {
            if (o === 0) continue; // Don't count feature in question
            let featureIndex = i + o;
            if (featureIndex < 0 || featureIndex >= features.length) {
                switch (padding) {
                    case "mirror":
                        featureIndex = i - o;
                        break;
                    case "repeat":
                        featureIndex < 0 ? (featureIndex = 0) : (featureIndex = features.length - 1);
                        break;
                    default:
                    case "zero":
                        continue;
                }
            }
            const kernelIndex = o + halfWindowSizeSamples + (o > 0 ? -1 : 0);
            for (let f = 0; f < featureSize; f++) {
                averageTimbre[f] += features[featureIndex][f] * gaussianKernel[kernelIndex];
            }
        }
        averagedFeature.push(averageTimbre);
    }
    return averagedFeature;
}

export function computeFromFeaturesGMM(features) {
    const n_groups = 5;
    const epsilon = 0.01;
    const groups = multivariate_gaussian_fit(features, n_groups, epsilon);
    log.debug("ExpectationMaximization GROUPS", groups);
    const weights = groups.map((group) => group.weight);
    const means = groups.map((group) => group.mu);
    const covariances = groups.map((group) => group.sigma);

    const gmm = new GMM({ weights, means, covariances });

    const uniquenessFeature = [];
    for (let i = 0; i < features.length; i++) {
        const probabilities = gmm.predictNormalize(features[i]);
        const maxProbability = Math.max(...probabilities);
        uniquenessFeature.push(1 - maxProbability);
    }
    return uniquenessFeature;
}

export function computeLocalUniqueness(ssm, min = 1, window = 20) {
    const size = ssm.getSize();
    const minSamples = Math.floor(min / ssm.sampleDuration);
    const windowSamples = Math.floor(window / ssm.sampleDuration);

    const small = filter.gaussianBlur2DOptimized(ssm, minSamples);
    const large = filter.gaussianBlur2DOptimized(ssm, windowSamples);

    const uniquenessSSM = SSM.subtract(large, small);

    const uniquenessFeature = [];
    for (let col = 0; col < size; col++) {
        let sum = 0;
        for (let row = 0; row < size; row++) {
            sum += uniquenessSSM.getValueNormalizedMirrored(col, row);
        }
        sum--;
        uniquenessFeature.push(sum / size);
    }
    return uniquenessFeature;
}
