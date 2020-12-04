import * as noveltyDetection from "./noveltyDetection";
import * as log from "../dev/log";
import * as pathExtraction from "./pathExtraction";
import assert from "assert"

export function createSegmentsFromNovelty(novelty, sampleDuration, threshold) {
    log.debug("Create sections from novelty");
    //const maxima = noveltyDetection.findLocalMaxima(novelty, threshold);
    let peaks= noveltyDetection.findPeaks(novelty);
    peaks = peaks.filter(peak => peak.confidence > 0.1);
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
export function findGreedyDecomposition(pathSSM, structureSegments, sampleDuration, strategy = "classic", comparisonProperty = "fitness", smallestAllowedSize = 4) {
    const trackEnd = structureSegments[structureSegments.length - 1].end;
    let structureSections = [];
    const segments = []
    log.debug("Finding greedy Decomposition")
    let separateSegmentSets = [structureSegments];

    let i = 0;
    const maxRepeats = 14;
    while (separateSegmentSets.length > 0 && i < maxRepeats) {
        let separateCandidateSets = computeSeparateStructureCandidates(pathSSM, separateSegmentSets, strategy)

        const allCandidates = [].concat.apply([], separateCandidateSets);
        if (allCandidates.length === 0) {
            break;
        }
        const allCandidatesSorted = allCandidates.sort((a, b) => a[comparisonProperty] > b[comparisonProperty] ? 1 : -1);

        let best = allCandidatesSorted.pop();
        if (wiggle) {
            best = findBetterFit(pathSSM, best, 4, comparisonProperty, strategy, structureSections);
        }
        if(best === null || best[comparisonProperty] <= 0 || isNaN(best[comparisonProperty])) {
            break;
        }
        //log.debug("BEST", i, best);
        const label = i;
        best.label = label;

        best.pathFamily.forEach((path, index) => {
            const start = path[path.length - 1][1] * sampleDuration;
            const end = (path[0][1] + 1) * sampleDuration;
            const duration = end - start;
            const section = { start, end, duration, label, confidence: best.pathScores[index] }
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
            section.pathFamily = best.pathFamily
            structureSections.push(section);
        })
        // sort structuresections
        structureSections = structureSections.sort((a, b) => a.start > b.start ? 1 : -1);

        separateSegmentSets = subtractStructureFromSegments(JSON.parse(JSON.stringify(separateSegmentSets)), structureSections, trackEnd, smallestAllowedSize);
        const allSegments = [].concat.apply([], separateSegmentSets);
        allSegments.forEach(segment => segment.label = i);
        segments.push(...allSegments);
        i++;
    }
    return [structureSections, i, segments];
}

function findBetterFit(pathSSM, section, sampleOffset = 4, comparisonProperty, strategy, structureSections = []) {
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
            
            const startInSeconds = start*sampleDuration;
            const endInSeconds = end*sampleDuration;
            // TODO: also check for overlap with existing sections
            
            if (start >= 0 && end < sampleAmount && startOffset < endOffset && !overlapWithStructureSections({start: startInSeconds, end: endInSeconds}, structureSections)) {
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

function subtractStructureFromSegmentsOld(separateSegmentSets, structureSections) {
    let newSeparateSegmentSets = [];
    const structureSectionsLeftToHit = JSON.parse(JSON.stringify(structureSections));
    const allSegments = [].concat.apply([], separateSegmentSets);

    let segmentSet = [];
    let startAddingTime = 0;
    allSegments.forEach(segment => {
        if (segment.start >= startAddingTime) {
            segmentSet.push(segment);
        } else if (segment.end > startAddingTime) {
            segment.start = startAddingTime;
            segment.duration = segment.end - segment.start;
            segmentSet.push(segment);

        }
        structureSectionsLeftToHit.some((section, index) => {
            // Check if a segment hits the structure section
            if (segment.end >= section.start) {
                // clip the end of the last segment
                segment.end = section.start;
                segment.duration = segment.end - segment.start;
                startAddingTime = section.end;

                // remove structure section
                structureSectionsLeftToHit.splice(index, 1);
                if (segmentSet.length > 0) {
                    newSeparateSegmentSets.push(segmentSet);
                    segmentSet = [];
                }
                return true;
            }
        })
    })
    if (segmentSet.length > 0) {
        newSeparateSegmentSets.push(segmentSet);
    }
    return newSeparateSegmentSets;
}

export function overlaps(a, b) {
    return (a.start <= b.start && a.end > b.start) ||
     (a.start < b.start && a.end >= b.end) ||
     (b.start <= a.start && b.end > a.start)  || 
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