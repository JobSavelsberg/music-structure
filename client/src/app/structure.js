import * as noveltyDetection from "./noveltyDetection";
import * as log from "../dev/log";
import * as pathExtraction from "./pathExtraction";
import * as mds from "./mds";

import assert from "assert"


export function createFixedDurationStructureSegments(sampleAmount, sampleDuration, duration){
    const structureSegments = [];
    let start = 0;
    while(start < sampleAmount){
        structureSegments.push({
            start: start*sampleDuration,
            duration: duration*sampleDuration,
            end: start+duration,
            confidence: 1,
        });
        start += duration;
    }
    return structureSegments;
}

export function createSegmentsFromNovelty(novelty, sampleDuration, threshold = 0.1) {
    log.debug("Create sections from novelty");
    //const maxima = noveltyDetection.findLocalMaxima(novelty, threshold);
    let peaks = noveltyDetection.findPeaks(novelty);
    peaks = peaks.filter(peak => peak.confidence > threshold);
    const structureSegments = [];

    for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i];
        const start = peak.sample * sampleDuration;
        const end =
            i < peaks.length - 1 ? sampleDuration * peaks[i + 1].sample : sampleDuration * novelty.length;
        const duration = end - start;
        const confidence = peak.confidence;
        const label = structureSegments.length;
        structureSegments.push({
            start,
            duration,
            end,
            confidence,
            label,
        });
    }
    return structureSegments;
}


export function computeStructureCandidates(pathSSM, structureSegments, minDurationSeconds = 1, maxRatio = 0.4, strategy) {
    const sampleAmount = pathSSM.getSampleAmount();
    const segmentAmount = structureSegments.length;
    const sampleDuration = pathSSM.sampleDuration;
    const maxLength = maxRatio * sampleAmount * sampleDuration;
    const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(sampleAmount);
    const candidates = [];


    for (let start = 0; start < segmentAmount; start++) {
        for (let end = start; end < segmentAmount; end++) {

            const startInSeconds = structureSegments[start].start;
            const endInSeconds = structureSegments[end].end;
            const segmentLengthInSeconds = endInSeconds - startInSeconds;
            if (segmentLengthInSeconds < minDurationSeconds || segmentLengthInSeconds > maxLength) continue;
            const startInSamples = Math.floor(startInSeconds / sampleDuration);
            const endInSamples = Math.floor(endInSeconds / sampleDuration);

            const segmentPathFamilyInfo = pathExtraction.computeSegmentPathFamilyInfo(pathSSM, startInSamples, endInSamples, scoreMatrixBuffer, strategy)

            segmentPathFamilyInfo.start = startInSeconds;
            segmentPathFamilyInfo.duration = segmentLengthInSeconds;
            segmentPathFamilyInfo.end = endInSeconds;
            segmentPathFamilyInfo.label = candidates.length;

            candidates.push(segmentPathFamilyInfo);
        }
    }

    return candidates;
}


export function computeSeparateStructureCandidates(pathSSM, separateSegmentSets, strategy, minDurationSeconds = 1, maxRatio = 0.4) {
    const separateCandidateSets = [];
    separateSegmentSets.forEach(segments => {
        const candidates = computeStructureCandidates(pathSSM, segments, minDurationSeconds, maxRatio, strategy);
        separateCandidateSets.push(candidates);
    })

    return separateCandidateSets;
}

// Structure is not sorted, structuresegments is
const wiggle = true;
const wiggleSize = 2;
export function findGreedyDecomposition(pathSSM, structureSegments, sampleDuration, strategy = "classic", comparisonProperty = "fitness", minDurationSeconds = 2) {
    const trackEnd = structureSegments[structureSegments.length - 1].end;
    let structureSections = [];
    const segments = []
    log.debug("Finding greedy Decomposition")
    let separateSegmentSets = [structureSegments];

    let i = 0;
    const maxRepeats = 14;
    while (separateSegmentSets.length > 0 && i < maxRepeats) {
        let separateCandidateSets = computeSeparateStructureCandidates(pathSSM, separateSegmentSets, strategy, minDurationSeconds)

        const allCandidates = [].concat.apply([], separateCandidateSets);
        if (allCandidates.length === 0) {
            break;
        }
        const allCandidatesSorted = allCandidates.sort((a, b) => a[comparisonProperty] > b[comparisonProperty] ? 1 : -1);
        log.debug(allCandidatesSorted)

        let best = allCandidatesSorted.pop();
        if (wiggle) {
            best = findBetterFit(pathSSM, best, wiggleSize, comparisonProperty, strategy, structureSections, minDurationSeconds);
        }
        if (best === null || best[comparisonProperty] <= 0 || isNaN(best[comparisonProperty])) {
            break;
        }
        log.debug("BEST", i, best);
        const label = i;
        best.label = label;

        const pathFamily = getPathFamily(best, sampleDuration, label);
        const extendedPathFamily = getExtendedPathFamily(best,sampleDuration, label, pathSSM, strategy);
        const nonOverlappingExtendedPathFamily = addNonOverlapping(pathFamily , extendedPathFamily);
        const prunedPaths = pruneLowConfidence(nonOverlappingExtendedPathFamily, 0.1);
        structureSections.push(...prunedPaths)

        // sort structuresections
        structureSections = structureSections.sort((a, b) => a.start > b.start ? 1 : -1);

        separateSegmentSets = subtractStructureFromSegments(JSON.parse(JSON.stringify(separateSegmentSets)), structureSections, trackEnd, minDurationSeconds);
        const allSegments = [].concat.apply([], separateSegmentSets);
        allSegments.forEach(segment => segment.label = i);
        segments.push(...allSegments);
        i++;
    }
    return [structureSections, i, segments];
}

export function findAllFitSections(pathSSM, structureSegments, sampleDuration, strategy = "classic", comparisonProperty = "fitness", minDurationSeconds = 2){
    const trackEnd = structureSegments[structureSegments.length - 1].end;
    const structureSections = [];

    log.debug("Finding all fit sections")
    const candidates = computeStructureCandidates(pathSSM, structureSegments, minDurationSeconds = 1,  0.4, strategy);
    let candidatesSorted = candidates.sort((a, b) => a[comparisonProperty] > b[comparisonProperty] ? 1 : -1);

    let i = 0;
    const maxRepeats = 14;
    while (i < maxRepeats) {
        let best = candidatesSorted.pop();
        if (best === null || best[comparisonProperty] <= 0 || isNaN(best[comparisonProperty])) {
            break;
        }
        const label = i;

        // add family 
        const prunedSections = pruneLowConfidence(getExtendedPathFamily(best,sampleDuration, label, pathSSM, strategy), 0.2);
        const mergedSections = mergeOverlap(prunedSections);
        structureSections.push(...mergedSections)


        // Remove sections similar to best + family from candidates
        candidatesSorted = candidatesSorted.filter((candidate) => {

            // if any section is similar ? remove candidate
            const hasSimilarSection = structureSections.some((section) => {
                const candidateMiddle = candidate.start + candidate.duration/2;
                const sectionMiddle = section.start + section.duration/2;

                const diffMiddle = Math.abs(candidateMiddle - sectionMiddle);
                const diffSize = Math.abs(candidate.duration - section.duration);

                // define circle base on size
                const distFactor = 0.5; // 0.5 sizeFactor means candidate size or offset needs to be at least half as small as the section size to be considered
                const maxDist = section.duration*distFactor;

                const dist = Math.sqrt(Math.pow(diffMiddle,2) + Math.pow(diffSize,2))
                //log.debug(dist, "<", maxDist,  "?:", candidate, section );

                return dist < maxDist ;
            })
            return !hasSimilarSection;
        });

        i++;
    }
    return [structureSections, i];
}


function getPathFamily(section, sampleDuration, label){
    const pathFamilySections = []
    section.pathFamily.forEach((path, index) => {
        const start = path[path.length - 1][1] * sampleDuration;
        const end = (path[0][1] + 1) * sampleDuration;
        const duration = end - start;
        const newSection = { start, end, duration, label, confidence: section.pathScores[index] }
        /*if (!isSameSectionWithinError(best, section, 2)) {
            // This is debatable, we might want to show this (why it got high fitness to begin with)
            //if (!overlapWithStructureSections(section, structureSections)) {
            structureSections.push(section);
            //}
        } else {
            // It's the best path itself, but use the segment defined by the coverage in the path family
            best.start = start;
            best.end = end;
            best.duration = duration;
            best.confidence = 1;
            structureSections.push(best);
        }*/
        newSection.pathFamily = section.pathFamily
        pathFamilySections.push(newSection);
    })
    return pathFamilySections;
}

// multiply confidence?
// includes regular family
function getExtendedPathFamily(section, sampleDuration, label, pathSSM, strategy){
    const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(pathSSM.getSampleAmount());

    const pathFamilySections = []
    section.pathFamily.forEach((path, index) => {
        const start = path[path.length - 1][1] * sampleDuration;
        const end = (path[0][1] + 1) * sampleDuration;
        const duration = end - start;
        const newSection = { start, end, duration, label, confidence: section.pathScores[index] }
        
        newSection.pathFamily = section.pathFamily
        pathFamilySections.push(newSection);
    })

    pathFamilySections.forEach(familySection => {
        const startInSamples = Math.floor(familySection.start / sampleDuration);
        const endInSamples = Math.floor(familySection.end / sampleDuration);

        const pathFamilyInfo = pathExtraction.computeSegmentPathFamilyInfo(pathSSM, startInSamples, endInSamples, scoreMatrixBuffer, strategy)
        pathFamilyInfo.pathFamily.forEach((path, index) => {
            const start = path[path.length - 1][1] * sampleDuration;
            const end = (path[0][1] + 1) * sampleDuration;
            const duration = end - start;
            const newSection = { start, end, duration, label, confidence: familySection.confidence * pathFamilyInfo.pathScores[index]}
            
            newSection.pathFamily = section.pathFamily
            pathFamilySections.push(newSection);
        })
    })

    return pathFamilySections;
}

function pruneLowConfidence(sections, minConfidence){
    const prunedSections = [];
    sections.forEach(section => {
        if(section.confidence >= minConfidence) prunedSections.push(section)
    })
    return prunedSections;
}

function addNonOverlapping(sectionsA, sectionsB){
    const allSections = [...sectionsA];

    const sortedSectionsB = sectionsB.sort((a, b) => a.confidence > b.confidence ? 1 : -1);

    sortedSectionsB.forEach(sectionB => {
        const hasOverlap = allSections.some(sectionA => {
            if(overlaps(sectionA, sectionB)){
                return true;
            }
        })
        if(!hasOverlap){
            allSections.push(sectionB);
        }
    })

    return allSections;
}

function mergeOverlap(sections){
    const mergedSections = [];

    sections.forEach(section => {
        let indexToMergeWith = 0;
        const hasToMerge = mergedSections.some((mergedSection, index) => {
            // merge if middle is in section?
            if(overlaps(section, mergedSection)){
                indexToMergeWith = index;
                return true;
            }
        })
        if(hasToMerge){
            mergedSections[indexToMergeWith] = mergeSection(mergedSections[indexToMergeWith], section);
        }else{
            mergedSections.push(section);
        }
    })

    let overlapFound = true;
    let timeout = 1000;
    while(overlapFound || timeout < 0){
        let overlapIndexA = 0;
        let overlapIndexB = 0;
        overlapFound = mergedSections.some((sectionA, indexA) => {
            return mergedSections.some((sectionB, indexB) => {
                if(overlaps(sectionA, sectionB) && sectionA !== sectionB){
                    overlapIndexA = indexA;
                    overlapIndexB = indexB;
                    return true;
                }
            })
        })
        if(overlapFound){
            log.debug("Foudn overlap")
            const sectionA = mergedSections[overlapIndexA];
            const sectionB = mergedSections[overlapIndexB]
            const mergedSection = mergeSection(sectionA, sectionB)
            mergedSections.splice(overlapIndexB, 1);
            mergedSections[overlapIndexA] = mergedSection;
        }
        timeout--;
    }

    return mergedSections;
}

function mergeSection(sectionA, sectionB){
    const start = Math.min(sectionA.start, sectionB.start);
    const end = Math.max(sectionA.end, sectionB.end);
    return {start, end, duration: end-start,label: sectionA.label, confidence: sectionA.confidence} 
}

function findBetterFit(pathSSM, section, sampleOffset = 4, comparisonProperty, strategy, structureSections = [], minDurationSeconds) {
    const sampleAmount = pathSSM.getSampleAmount();
    const sampleDuration = pathSSM.sampleDuration;

    const startInSamples = Math.floor(section.start / sampleDuration);
    const endInSamples = Math.floor(section.end / sampleDuration);

    const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(sampleAmount);
    let max = section[comparisonProperty];
    let bestFit = section;

    for (let startOffset = -sampleOffset; startOffset < sampleOffset; startOffset++) {
        for (let endOffset = -sampleOffset; endOffset < sampleOffset; endOffset++) {
            const start = startInSamples + startOffset;
            const end = endInSamples + endOffset;

            const startInSeconds = start * sampleDuration;
            const endInSeconds = end * sampleDuration;
            // TODO: also check for overlap with existing sections

            if (start >= 0 && end < sampleAmount && endInSeconds -startInSeconds >= minDurationSeconds && !overlapWithStructureSections({ start: startInSeconds, end: endInSeconds }, structureSections)) {
                const segmentPathFamilyInfo = pathExtraction.computeSegmentPathFamilyInfo(pathSSM, start, end, scoreMatrixBuffer, strategy)

                segmentPathFamilyInfo.start = start * sampleDuration;
                segmentPathFamilyInfo.end = end * sampleDuration;
                segmentPathFamilyInfo.duration = segmentPathFamilyInfo.end - segmentPathFamilyInfo.start;

                if (segmentPathFamilyInfo[comparisonProperty] > max) {
                    // TODO: log how the max moves (maybe it needs more offset to reach optimum)
                    bestFit = segmentPathFamilyInfo;
                    max = segmentPathFamilyInfo[comparisonProperty];
                }
            }
        }
    }

    return bestFit;
}

function overlapWithStructureSections(section, structureSections) {
    return structureSections.some(structureSection => {
        if (overlaps(section, structureSection)) return true;
    })
}


function subtractStructureFromSegments(separateSegmentSets, sortedStructureSections, trackEnd, smallestAllowedSize) {
    let newSeparateSegmentSets = [];
    const allSegments = [].concat.apply([], separateSegmentSets);


    const freeRanges = getFreeRanges(sortedStructureSections, trackEnd, smallestAllowedSize);
    freeRanges.forEach(range => {
        const rangeStart = range[0];
        const rangeEnd = range[1];
        let segmentSet = [];

        let previousBorder = rangeStart;
        allSegments.forEach(segment => {
            if (segment.start > previousBorder && segment.start < rangeEnd) {
                segmentSet.push({
                    start: previousBorder,
                    end: segment.start,
                    duration: segment.start - previousBorder,
                })
                previousBorder = segment.start;
            }
        })
        segmentSet.push({
            start: previousBorder,
            end: rangeEnd,
            duration: rangeEnd - previousBorder,
        })
        newSeparateSegmentSets.push(segmentSet);
    })


    return newSeparateSegmentSets
}

function getFreeRangesNonOverlapping(structureSections, trackEnd, smallestAllowedSize) {
    const freeRanges = [];
    let previousEnd = 0;
    structureSections.forEach(section => {
        freeRanges.push([previousEnd, section.start]);
        previousEnd = section.end;
    })
    freeRanges.push([previousEnd, trackEnd]);
    return freeRanges.filter(range => range[1] - range[0] >= smallestAllowedSize)
}

function getFreeRanges(structureSections, trackEnd, smallestAllowedSize) {
    const freeRanges = [[0, trackEnd]];
    structureSections.forEach(section => {
        freeRanges.forEach((range, rangeIndex) => {
            const rangeStart = range[0];
            const rangeEnd = range[1];
            // if range is encapsulated by section, remove
            if (rangeStart >= section.start && rangeEnd <= section.end) {
                freeRanges.splice(rangeIndex, 1);
                return;
            }
            // if range overlaps section on left, cut range short, clip end
            if (rangeStart <= section.start && rangeEnd > section.start && rangeEnd <= section.end) {
                range[1] = section.start;
                return;
            }
            // if range overlaps section on right, cut range short, clip start
            if (rangeStart < section.end && rangeEnd >= section.start && rangeStart >= section.start) {
                range[0] = section.end;
                return;
            }
            // if range encapsulates section, cut range in half
            if (rangeStart < section.start && rangeEnd > section.end) {
                freeRanges.push([rangeStart, section.start]);
                freeRanges.push([section.end, rangeEnd]);
                freeRanges.splice(rangeIndex, 1);
                return;
            }
        })
    })
    return freeRanges.filter(range => range[1] - range[0] >= smallestAllowedSize)
}


/**
 * Picks highest similarity pair, labels segments not yet labeled, repeat
 * @param {*} segments 
 */
export function labelSimilarSegments(segments, pathSSM, maxDistance = 0.75){
    const labeledSegments = JSON.parse(JSON.stringify(segments)); 
    labeledSegments.forEach(segment => {
        delete segment.label;
        segment.confidence = 1;
    });

    let labeled = 0;
    let newLabel = 0;
    while(labeled < segments.length){
        let minDistance = Number.POSITIVE_INFINITY;
        let bestSegmentA = null;
        let bestSegmentB = null;
        labeledSegments.forEach(segmentA => {
            labeledSegments.forEach(segmentB => {
                if((segmentA.label  === undefined  || segmentB.label  === undefined ) && segmentA !== segmentB){
                    const distance = pathExtraction.getDistanceBetween(segmentA, segmentB, pathSSM)
                    if(distance < minDistance){
                        minDistance = distance;
                        bestSegmentA = segmentA;
                        bestSegmentB = segmentB;
                    }
                }
            })
        })
        if(!bestSegmentA || !bestSegmentB){
            break;
        }
        if(minDistance > maxDistance){
            if(bestSegmentA.label === undefined && bestSegmentB.label  === undefined ){
                bestSegmentA.label = newLabel;
                newLabel++;
                bestSegmentB.label = newLabel;
            }else if(bestSegmentA.label  === undefined ){
                bestSegmentA.label = newLabel;
            }else if(bestSegmentB.label  === undefined ){
                bestSegmentB.label = newLabel;
            }
            newLabel++;
        }else{
            if(bestSegmentA.label  === undefined && bestSegmentB.label  === undefined ){
                bestSegmentA.label = newLabel;
                bestSegmentB.label = newLabel;
                newLabel++;
            }else if( bestSegmentA.label  === undefined ){
                bestSegmentA.label = bestSegmentB.label;
                bestSegmentA.confidence = 1-minDistance;
            }else if(bestSegmentB.label  === undefined ){
                bestSegmentB.label = bestSegmentA.label;
                bestSegmentB.confidence = 1-minDistance;
            }
        }
    }
    return labeledSegments;
}

export function MDSColorSegments(segments, pathSSM){
    const coloredSegments = [];
    const distanceMatrix = pathExtraction.getDistanceMatrix(segments, pathSSM);
    const MdsCoordinates = mds.getMdsCoordinatesWithGradientDescent(distanceMatrix);
    segments.forEach((segment, index) => {
        const [angle, radius] = mds.getAngleAndRadius(MdsCoordinates[index]);
        segment.colorAngle = angle;
        coloredSegments.push(segment);
        log.debug(radius);
    })

    return coloredSegments;
}   

export function overlaps(a, b) {
    return (a.start <= b.start && a.end > b.start) ||
        (a.start < b.start && a.end >= b.end) ||
        (b.start <= a.start && b.end > a.start) ||
        (b.start < a.start && b.end >= a.end) ||
        (a.start >= b.start && a.end <= b.end) ||
        (b.start >= a.start && b.end <= a.end)
}


export function disjoint(a, b) {
    return a.start >= b.end || a.end <= b.start
}

export function isSameSectionWithinError(a, b, errorInSamples) {
    const middleA = a.start + a.duration / 2;
    const middleB = b.start + b.duration / 2;
    return Math.abs(middleB - middleA) < errorInSamples
}