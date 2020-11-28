import * as noveltyDetection from "./noveltyDetection";
import * as log from "../dev/log";
import * as pathExtraction from "./pathExtraction";
import { stratify } from "d3";

export function createSegmentsFromNovelty(novelty, sampleDuration, threshold) {
    log.debug("Create sections from novelty");
    const maxima = noveltyDetection.findLocalMaxima(novelty, threshold);

    const structureSegments = [];

    for (let i = 0; i < maxima.length; i++) {
        const maximaIndex = maxima[i];
        const start = maximaIndex * sampleDuration;
        const end =
            i < maxima.length - 1 ? sampleDuration * maxima[i + 1] : sampleDuration * novelty.length;

        const duration = end - start;
        const confidence = novelty[maximaIndex];
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


export function computeStructureCandidates(pathSSM, structureSegments, minDurationSeconds = 5, maxRatio = 0.4) {
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

            const segmentPathFamilyInfo = pathExtraction.computeSegmentPathFamilyInfo(pathSSM, startInSamples, endInSamples, scoreMatrixBuffer)

            segmentPathFamilyInfo.start = startInSeconds;
            segmentPathFamilyInfo.duration = segmentLengthInSeconds;
            segmentPathFamilyInfo.end = endInSeconds;
            segmentPathFamilyInfo.label = candidates.length;

            candidates.push(segmentPathFamilyInfo);
        }
    }

    return candidates;
}

export function computeSeparateStructureCandidates(pathSSM, separateSegmentSets, minDurationSeconds = 4, maxRatio = 0.4) {
    const separateCandidateSets = []
    separateSegmentSets.forEach(segments => {
        const candidates = computeStructureCandidates(pathSSM, segments, minDurationSeconds, maxRatio);
        separateCandidateSets.push(candidates);
    })

    return separateCandidateSets;
}

// Structure is not sorted, structuresegments is
const wiggle = false;
export function findGreedyDecomposition(pathSSM, structureSegments, sampleDuration, comparisonProperty = "fitness", smallestAllowedSize = 1) {
    const trackEnd = structureSegments[structureSegments.length - 1].end;
    let structureSections = [];
    const segments = []
    log.debug("Finding greedy Decomposition")
    let separateSegmentSets = [structureSegments];

    let i = 0;
    const maxRepeats = 3;
    while (separateSegmentSets.length > 0 && i < maxRepeats) {
        let separateCandidateSets = computeSeparateStructureCandidates(pathSSM, separateSegmentSets)
        const allCandidates = [].concat.apply([], separateCandidateSets);
        if (allCandidates.length === 0) {
            break;
        }
        const allCandidatesSorted = allCandidates.sort((a, b) => a[comparisonProperty] > b[comparisonProperty] ? 1 : -1);

        let best = allCandidatesSorted.pop();
        if (wiggle) {
            best = findBetterFit(pathSSM, best, 4, comparisonProperty);
        }
        const label = i;
        best.label = label;

        best.pathFamily.forEach(path => {
            const start = path[path.length - 1][1] * sampleDuration;
            const end = (path[0][1] + 1) * sampleDuration;
            const duration = end - start;
            const section = { start, end, duration, label }
            if (!isSameSectionWithinError(best, section, 2)) {
                // This is debatable, we might want to show this (why it got high fitness to begin with)
                //if (!overlapWithStructureSections(section, structureSections)) {
                structureSections.push(section);
                //}
            } else {
                // It's the best path itself, but use the segment defined by the coverage in the path family
                best.start = start;
                best.end = end;
                best.duration = duration;
                structureSections.push(best);
            }
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

function findBetterFit(pathSSM, section, sampleOffset = 4, comparisonProperty) {
    log.debug("Find better fit")
    const sampleAmount = pathSSM.getSampleAmount();
    const sampleDuration = pathSSM.sampleDuration;

    const startInSamples = Math.floor(section.start / sampleDuration);
    const endInSamples = Math.floor(section.end / sampleDuration);

    const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(sampleAmount);
    let max = 0;
    let bestFit = null

    for (let startOffset = -sampleOffset; startOffset < sampleOffset; startOffset++) {
        for (let endOffset = -sampleOffset; endOffset < sampleOffset; endOffset++) {
            const start = startInSamples + startOffset;
            const end = endInSamples + endOffset;
            log.debug("Checking", start, end);
            // TODO: also check for overlap with existing sections
            if (start >= 0 && end < sampleAmount) {
                const segmentPathFamilyInfo = pathExtraction.computeSegmentPathFamilyInfo(pathSSM, start, end, scoreMatrixBuffer)

                segmentPathFamilyInfo.start = start * sampleDuration;
                segmentPathFamilyInfo.end = end * sampleDuration;
                segmentPathFamilyInfo.duration = segmentPathFamilyInfo.end - segmentPathFamilyInfo.start;

                if (segmentPathFamilyInfo[comparisonProperty] > max) {
                    log.debug("Found max", segmentPathFamilyInfo[comparisonProperty]);
                    // TODO: log how the max moves (maybe it needs more offset to reach optimum)
                    bestFit = segmentPathFamilyInfo;
                    log.debug(bestFit.start, bestFit.end)
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
    return (a.start <= b.start && a.end > b.start) || (a.start < b.start && a.end >= b.end) || (a.start >= b.start && a.end <= b.end)
}

export function overlapsOld(a, b) {
    return (a.start <= b.start && a.end >= b.end) ||
        (a.start >= b.start && a.end <= b.end) ||
        (a.end >= b.start && a.end < b.end) ||
        (a.start > b.start && a.start <= b.end)
}

export function disjoint(a, b) {
    return a.start >= b.end || a.end <= b.start
}

export function isSameSectionWithinError(a, b, errorInSamples) {
    const middleA = a.start + a.duration / 2;
    const middleB = b.start + b.duration / 2;
    return Math.abs(middleB - middleA) < errorInSamples
}