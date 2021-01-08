import * as pathExtraction from "./pathExtraction";
import * as log from "../dev/log";
import { path } from "d3";


export function computeFitness(pathFamily, pathScores, score, sampleAmount, width) {
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
    let fitness = (2 * normalizedScore * normalizedCoverage) / (normalizedScore + normalizedCoverage + error);

    return { fitness, normalizedScore, coverage, normalizedCoverage, pathFamilyLength,prunedPathFamily: pathFamily };
}

export function computeCustomFitness(pathFamily, pathScores, score, sampleAmount, width) {
    const pathAmount = pathFamily.length;
    const error = 1e-16;
    const normalizedPathAmount = (pathAmount-1);

    // normalized score
    // we subtract the given self similarity path, and divide by total length of all paths (+ error to prevent divide by 0)
    let pathFamilyLength = 0;
    for (let p = 0; p < pathAmount; p++) {
        pathFamilyLength += pathFamily[p].length / 2; // /2 because we store x and y flat
    }
    const normalizedScore = Math.max(0, (score - width) / (pathFamilyLength + error));

    // normalized coverage
    const coverage = computeInducedCoverage(pathFamily);
    let normalizedCoverage = (coverage - width) / (sampleAmount + error);

    // fitness
    let fitness = (2 * normalizedScore * normalizedCoverage) / (normalizedScore + normalizedCoverage + error);
    //fitness = (3 * normalizedScore * normalizedCoverage* normalizedPathAmount )/ (normalizedScore * normalizedCoverage + normalizedCoverage * normalizedPathAmount + normalizedPathAmount * normalizedScore);
    return { fitness, normalizedScore, coverage, normalizedCoverage, pathFamilyLength,prunedPathFamily: pathFamily };
}

export function computeCustomPrunedFitness(pathFamily, pathScores, score, sampleAmount, width) {
    const [prunedPathFamily, prunedPathScores, totalScore] = prunePathFamily(pathFamily, pathScores, width, 0.25, 0.05);
    pathFamily = prunedPathFamily;
    pathScores = prunedPathScores;
    score = totalScore;
    const error = 1e-16;

    // normalize pathAmount
    const pathAmount = pathFamily.length;
    const normalizedPathAmount = (pathAmount-1);

    // normalized score
    // we subtract the given self similarity path, and divide by total length of all paths (+ error to prevent divide by 0)
    let pathFamilyLength = 0;
    for (let p = 0; p < pathAmount; p++) {
        pathFamilyLength += pathFamily[p].length / 2; // /2 because we store x and y flat
    }
    const normalizedScore = Math.max(0, (score - width) / (pathFamilyLength + error));
    if(normalizedScore <= 0){
        //log.debug(score, width, pathAmount, pathFamilyLength)
    }
    // normalized coverage
    const coverage = computeInducedCoverage(pathFamily);
    let normalizedCoverage = (coverage - width) / (sampleAmount + error);
    //normalizedCoverage *= (normalizedPathAmount);

    // fitness
    let fitness = (2 * normalizedScore * normalizedCoverage) / (normalizedScore + normalizedCoverage + error);
    fitness*=Math.log(normalizedPathAmount);
    //fitness =  Math.sqrt(normalizedPathAmount*normalizedScore*normalizedCoverage);
    //fitness = normalizedPathAmount*normalizedCoverage*normalizedScore;

    return { fitness, normalizedScore, coverage, normalizedCoverage, pathFamilyLength, prunedPathFamily: pathFamily};
}



export function computePrunedFitness(pathFamily, pathScores, score, sampleAmount, width) {
    const [prunedPathFamily, prunedPathScores, totalScore] = prunePathFamily(pathFamily, pathScores, width, 0.5, 0.4);
    pathFamily = prunedPathFamily;
    pathScores = prunedPathScores;
    score = totalScore;

    const pathAmount = pathFamily.length;
    const error = 1e-16;

    // normalized score
    // we subtract the given self similarity path, and divide by total length of all paths (+ error to prevent divide by 0)
    //log.debug(pathFamily);
    let pathFamilyLength = width * pathAmount;
    const normalizedScore = Math.max(0, (score - width) / (pathFamilyLength + error));

    // normalized coverage
    const coverage = computeInducedCoverage(pathFamily, pathScores);
    const normalizedCoverage = (coverage - width) / (sampleAmount + error);
    const normalizedNonInducedCoverage = (pathFamilyLength-width)/ (sampleAmount + error);

    // fitness
    let fitness = (2 * normalizedScore * normalizedNonInducedCoverage) / (normalizedScore + normalizedNonInducedCoverage + error);

    //fitness = (2 * normalizedScore * pathFamilyLength) / (normalizedScore + pathFamilyLength + error);

    return { fitness, normalizedScore, coverage, normalizedCoverage, pathFamilyLength, prunedPathFamily, prunedPathScores};
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


export function prunePathFamily(pathFamily, pathScores, width, smallestRatio=0.3, smallestScore=0.3){
    const totalScore = pathScores.reduce((a, b) => a + b, 0);
    const normalizedTotalScore = totalScore - width;
    const pathLength = pathFamily.length;
    const averageScore = normalizedTotalScore / (pathLength-1)
    let bestScore = 0;
    let secondBestScore = 0;
    pathScores.forEach(score => {
        if(score > bestScore){
            bestScore = score;
        }
    })
    pathScores.forEach(score => {
        if(score > secondBestScore && score < bestScore){
            secondBestScore = score;
        }
    })

    const prunedPathFamily = [];
    const prunedPathScores = [];
    for(let p = 0; p< pathLength; p++){
        const path = pathFamily[p];
        const score = pathScores[p];
        if(score > smallestRatio* secondBestScore && score/width > smallestScore){
            prunedPathFamily.push(path);
            prunedPathScores.push(score);
        }
    }
    return [prunedPathFamily, prunedPathScores, totalScore];
}