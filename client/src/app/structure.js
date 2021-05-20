import * as noveltyDetection from "./noveltyDetection";
import * as log from "../dev/log";
import * as pathExtraction from "./pathExtraction";
import * as similarity from "./similarity";
import * as mds from "./mds";
import * as clustering from "./clustering";
import * as SSM from "./SSM";
import * as _ from "lodash";
import HalfMatrix from "./dataStructures/HalfMatrix";
import Section from "./Section";

export function createFixedDurationStructureSegments(sampleAmount, sampleDuration, duration) {
    const structureSegments = [];
    let start = 0;
    while (start + duration < sampleAmount) {
        structureSegments.push(
            new Section({ start: start * sampleDuration, end: (start + duration) * sampleDuration })
        );
        start += duration;
    }
    return structureSegments;
}

export function createSegmentsFromNovelty(novelty, sampleDuration, threshold = 0.1) {
    //const maxima = noveltyDetection.findLocalMaxima(novelty, threshold);
    let peaks = noveltyDetection.findPeaks(novelty);
    peaks = peaks.filter((peak) => peak.confidence > threshold);
    const structureSegments = [];

    for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i];
        const start = peak.sample * sampleDuration;
        const end = i < peaks.length - 1 ? sampleDuration * peaks[i + 1].sample : sampleDuration * novelty.length;
        const confidence = peak.confidence;
        const groupID = structureSegments.length;
        structureSegments.push(
            new Section({
                start,
                end,
                confidence,
                groupID,
            })
        );
    }
    return structureSegments;
}

export function computeStructureCandidates(
    pathSSM,
    structureSegments,
    minDurationSeconds = 1,
    maxRatio = 0.4,
    strategy
) {
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

            candidates.push(
                createCandidate(pathSSM, startInSamples, endInSamples, scoreMatrixBuffer, strategy, candidates.length)
            );
        }
    }

    return candidates;
}

export function computeSeparateStructureCandidates(
    pathSSM,
    separateSegmentSets,
    strategy,
    minDurationSeconds = 1,
    maxRatio = 0.25
) {
    const separateCandidateSets = [];
    separateSegmentSets.forEach((segments) => {
        const candidates = computeStructureCandidates(pathSSM, segments, minDurationSeconds, maxRatio, strategy);
        separateCandidateSets.push(candidates);
    });

    return separateCandidateSets;
}

export function findFittestSections(ssm, segments, strategy = "classic") {
    const size = ssm.getSize();
    const sampleDuration = ssm.getSampleDuration();
    const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(size);

    const candidates = [];
    segments.forEach((segment) => {
        const startInSamples = Math.floor(segment.start / sampleDuration);
        const endInSamples = Math.floor(segment.end / sampleDuration);
        candidates.push(
            createCandidate(ssm, startInSamples, endInSamples, scoreMatrixBuffer, strategy, candidates.length)
        );
    });
    const sortedCandidates = candidates.sort(fitnessSort);
    const sections = [];

    let repeats = 0;
    while (sortedCandidates.length > 0 && repeats < segments.length) {
        repeats++;

        const bestSection = sortedCandidates.shift();
        bestSection.groupID = repeats;

        const pathFamily = getPathFamily(bestSection, sampleDuration, bestSection.groupID);
        const extendedPathFamily = getExtendedPathFamily(
            bestSection,
            sampleDuration,
            bestSection.groupID,
            ssm,
            strategy
        );
        const nonOverlappingExtendedPathFamily = addNonOverlapping(pathFamily, extendedPathFamily);
        const prunedPaths = pruneLowConfidence(nonOverlappingExtendedPathFamily, 0.15);
        prunedPaths.forEach((path) => {
            path.normalizedScore = bestSection.normalizedScore;
            path.normalizedCoverage = bestSection.normalizedCoverage;
            path.fitness = bestSection.fitness;
        });
        sections.push(...prunedPaths);
    }

    return sections;
}

const allowOverlap = true;
export function findMuteDecomposition(
    pathSSM,
    structureSegments,
    sampleDuration,
    strategy = "classic",
    muteType = "or",
    updateCallback,
    comparisonProperty = "fitness",
    minDurationSeconds = 2,
    minFitness = 0.02
) {
    const trackEnd = structureSegments[structureSegments.length - 1].end;
    let structureSections = [];
    let sortedStructureSections = [];
    const segments = [];

    let separateSegmentSets = [structureSegments];

    let ssm = pathSSM;

    let i = 0;
    const maxRepeats = 14;
    while (separateSegmentSets.length > 0 && i < maxRepeats) {
        let separateCandidateSets = computeSeparateStructureCandidates(
            ssm,
            separateSegmentSets,
            strategy,
            minDurationSeconds
        );
        const allCandidates = [].concat.apply([], separateCandidateSets);
        if (allCandidates.length === 0) {
            break;
        }
        const allCandidatesSorted = allCandidates.sort((a, b) => {
            if (a[comparisonProperty] < b[comparisonProperty]) {
                return 1;
            }
            if (a[comparisonProperty] > b[comparisonProperty]) {
                return -1;
            }
            return 0;
        });

        let best = allCandidatesSorted.shift();
        const initialFitness = best.fitness;
        if (wiggle) {
            best = findBetterFit(
                ssm,
                best,
                wiggleSize,
                comparisonProperty,
                strategy,
                sortedStructureSections,
                minDurationSeconds,
                allowOverlap
            );
        }
        if (best === null || best[comparisonProperty] <= minFitness || isNaN(best[comparisonProperty])) {
            break;
        }
        const groupID = i;
        best.groupID = groupID;

        const pathFamily = getPathFamily(best, sampleDuration, groupID);
        const extendedPathFamily = getExtendedPathFamily(best, sampleDuration, groupID, pathSSM, strategy);
        const nonOverlappingExtendedPathFamily = addNonOverlapping(pathFamily, extendedPathFamily);
        const prunedPaths = pruneLowConfidence(nonOverlappingExtendedPathFamily, 0.1);
        prunedPaths.forEach((path) => {
            path.normalizedScore = best.normalizedScore;
            path.normalizedCoverage = best.normalizedCoverage;
            path.fitness = best.fitness;
            path.initFitness = initialFitness;
        });
        sortedStructureSections.push(...prunedPaths);
        structureSections.push(...prunedPaths);
        const prunedPathsInSamples = prunedPaths.map((section) => {
            const clone = section.clone();
            clone.start = Math.floor(clone.start / sampleDuration);
            clone.end = Math.floor(clone.end / sampleDuration);
            return clone;
        });
        if (muteType === "and") {
            ssm = SSM.muteAnd(ssm, prunedPathsInSamples);
        } else if (muteType === "remove") {
            ssm = SSM.removeSections(ssm, prunedPathsInSamples);
        } else {
            ssm = SSM.muteOr(ssm, prunedPathsInSamples);
        }

        sortedStructureSections = sortedStructureSections.sort((a, b) => (a.start > b.start ? 1 : -1));
        if (updateCallback) {
            updateCallback(structureSections);
        }

        separateSegmentSets = subtractStructureFromSegments(
            _.cloneDeep(separateSegmentSets),
            sortedStructureSections,
            trackEnd,
            minDurationSeconds
        );
        const allSegments = [].concat.apply([], separateSegmentSets);
        allSegments.forEach((segment) => (segment.groupID = i));
        segments.push(...allSegments);
        i++;
    }
    return [sortedStructureSections, i, segments];
}

export function findSubDecomposition(
    pathSSM,
    structureSections,
    minDurationSeconds = 2,
    strategy = "fine",
    minFitness = 0.15
) {
    const sampleDuration = pathSSM.getSampleDuration();
    const minDurationSamples = Math.ceil(minDurationSeconds / sampleDuration);

    let subStructureSections = [];

    let ID = 0;
    for (let i = 0; i < 20; i++) {
        let groupSections = structureSections.filter((section) => section.groupID === i);
        const smallestSize = groupSections.reduce((min, section) => {
            const size = section.end - section.start;
            return size < min ? size : min;
        }, Number.POSITIVE_INFINITY);
        const maxDurationSeconds = Math.ceil(smallestSize / 2);

        if (groupSections.length === 0) break;
        groupSections = subtractSegments(groupSections, subStructureSections);
        groupSections = groupSections.filter((section) => section.end - section.start >= minDurationSeconds);
        let subStructureSection;
        let j = 0;
        do {
            subStructureSection = findSubstructure(
                pathSSM,
                groupSections,
                maxDurationSeconds,
                minDurationSeconds,
                minFitness,
                strategy
            );
            if (subStructureSection) {
                const subPathFamily = getPathFamily(subStructureSection, sampleDuration, ID);
                const extendedSubPathFamily = getExtendedPathFamily(
                    subStructureSection,
                    sampleDuration,
                    ID,
                    pathSSM,
                    strategy
                );
                const nonOverlappingExtendedSubPathFamily = addNonOverlapping(subPathFamily, extendedSubPathFamily);
                const subFamily = pruneLowConfidence(nonOverlappingExtendedSubPathFamily, 0.1);

                subStructureSections.push(...subFamily);
                groupSections = subtractSegments(groupSections, subStructureSections);
                groupSections = groupSections.filter((section) => section.end - section.start >= minDurationSeconds);
                ID++;
                j++;
            } else {
                // no more fit sections, use up remaining sections?
                let remainingSections = groupSections.filter(
                    (section) => section.end - section.start >= minDurationSeconds
                );
                if (remainingSections.length > 0) {
                    remainingSections = remainingSections.map((s) => {
                        const newSection = s.clone();
                        newSection.groupID = ID;
                        return newSection;
                    });
                    if (j > 0) {
                        const candidates = [];
                        const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(pathSSM.getSampleAmount());
                        remainingSections.forEach((section) => {
                            const startInSamples = Math.floor(section.start / pathSSM.sampleDuration);
                            const endInSamples = Math.floor(section.end / pathSSM.sampleDuration);
                            candidates.push(
                                createCandidate(pathSSM, startInSamples, endInSamples, scoreMatrixBuffer, strategy, ID)
                            );
                        });
                        candidates.sort((a, b) => b.fitness - a.fitness);

                        let repeats = 0;
                        while (remainingSections.length > 0 && repeats < 1) {
                            repeats++;
                            const candidate = candidates.shift();
                            const subPathFamily = getPathFamily(candidate, sampleDuration, ID);
                            const extendedSubPathFamily = getExtendedPathFamily(
                                candidate,
                                sampleDuration,
                                ID,
                                pathSSM,
                                strategy
                            );
                            const nonOverlappingExtendedSubPathFamily = addNonOverlapping(
                                subPathFamily,
                                extendedSubPathFamily
                            );
                            const subFamily = pruneLowConfidence(nonOverlappingExtendedSubPathFamily, 0.1);

                            subStructureSections.push(...subFamily);
                            remainingSections = subtractSegments(remainingSections, subStructureSections);
                            remainingSections = remainingSections.filter(
                                (section) => section.end - section.start >= minDurationSeconds
                            );
                        }
                    } else {
                        subStructureSections.push(...remainingSections);
                    }

                    ID++;
                }
                break;
            }
        } while (subStructureSection && j < 10);
    }
    subStructureSections = sortGroupByCoverage(subStructureSections);
    return [subStructureSections, ID];
}

export function findSubstructure(
    pathSSM,
    courseSections,
    maxDurationSeconds,
    minDurationSeconds,
    minFitness,
    strategy = "fine"
) {
    const soloSSM = SSM.muteAnd(pathSSM, courseSections);

    const maxSubSizeSamples = Math.floor(maxDurationSeconds / pathSSM.sampleDuration);
    const minSubSizeSamples = Math.floor(minDurationSeconds / pathSSM.sampleDuration);
    if (maxSubSizeSamples < minSubSizeSamples) return;
    const step = 1;

    const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(pathSSM.getSampleAmount());

    const candidates = [];
    courseSections.forEach((section) => {
        const startInSamples = Math.floor(section.start / pathSSM.sampleDuration);
        const endInSamples = Math.floor(section.end / pathSSM.sampleDuration);

        for (let start = startInSamples; start < endInSamples - maxSubSizeSamples; start += step) {
            for (let duration = 1; duration < maxSubSizeSamples; duration += step) {
                candidates.push(
                    createCandidate(soloSSM, start, start + duration, scoreMatrixBuffer, strategy, section.groupID)
                );
            }
        }
    });
    // Assume that if the groupsections are same amount as subfamily, the subfamily is just pointing out largest fraction of groupsection
    const candidatesFiltered = candidates.filter(
        (c) => c.pathFamily.length !== courseSections.length && c.fitness >= minFitness
    );
    const candidatesSorted = candidatesFiltered.sort(fitnessSort);
    let best = candidatesSorted.shift();
    if (best === undefined) {
        return null;
    }
    if (best.end - best.start < minDurationSeconds) {
        return null;
    }

    return best;
}

// Structure is not sorted, structuresegments is
const wiggle = true;
const wiggleSize = 3;
export function findGreedyDecomposition(
    pathSSM,
    structureSegments,
    sampleDuration,
    strategy = "classic",
    comparisonProperty = "fitness",
    minDurationSeconds = 2,
    minFitness = 0.1
) {
    const trackEnd = structureSegments[structureSegments.length - 1].end;
    let structureSections = [];
    const segments = [];
    let separateSegmentSets = [structureSegments];

    let i = 0;
    const maxRepeats = 14;
    while (separateSegmentSets.length > 0 && i < maxRepeats) {
        let separateCandidateSets = computeSeparateStructureCandidates(
            pathSSM,
            separateSegmentSets,
            strategy,
            minDurationSeconds
        );
        const allCandidates = [].concat.apply([], separateCandidateSets);
        if (allCandidates.length === 0) {
            break;
        }
        const allCandidatesSorted = allCandidates.sort(fitnessSort);

        let best = allCandidatesSorted.shift();
        const initialFitness = best.fitness;
        if (wiggle) {
            best = findBetterFit(
                pathSSM,
                best,
                wiggleSize,
                comparisonProperty,
                strategy,
                structureSections,
                minDurationSeconds
            );
        }
        if (best === null || best[comparisonProperty] <= minFitness || isNaN(best[comparisonProperty])) {
            break;
        }
        const groupID = i;
        best.groupID = groupID;

        const pathFamily = getPathFamily(best, sampleDuration, groupID);
        const extendedPathFamily = getExtendedPathFamily(best, sampleDuration, groupID, pathSSM, strategy);
        const nonOverlappingExtendedPathFamily = addNonOverlapping(pathFamily, extendedPathFamily);
        const prunedPaths = pruneLowConfidence(nonOverlappingExtendedPathFamily, 0.1);
        prunedPaths.forEach((path) => {
            path.normalizedScore = best.normalizedScore;
            path.normalizedCoverage = best.normalizedCoverage;
            path.fitness = best.fitness;
            path.initFitness = initialFitness;
        });
        structureSections.push(...prunedPaths);

        // sort structuresections
        structureSections = structureSections.sort((a, b) => (a.start > b.start ? 1 : -1));

        separateSegmentSets = subtractStructureFromSegments(
            _.cloneDeep(separateSegmentSets),
            structureSections,
            trackEnd,
            minDurationSeconds
        );
        const allSegments = [].concat.apply([], separateSegmentSets);
        allSegments.forEach((segment) => (segment.groupID = i));
        segments.push(...allSegments);
        i++;
    }
    return [structureSections, i, segments];
}

function getPathFamily(section, sampleDuration, groupID) {
    const pathFamilySections = [];
    if (!section.pathFamily) return [];
    section.pathFamily.forEach((path, index) => {
        const start = path[path.length - 1][1] * sampleDuration;
        const end = (path[0][1] + 1) * sampleDuration;
        const pathConfidence = section.pathFamilyScores ? section.pathFamilyScores[index] : section.pathScores[index];
        const newSection = new Section({ start, end, groupID, confidence: pathConfidence });
        /*if (!isSameSectionWithinError(best, section, 2)) {
        // This is debatable, we might want to show this (why it got high fitness to begin with)
        //if (!overlapWithStructureSections(section, structureSections)) {
        structureSections.push(section);
        //}
    } else {
        // It's the best path itself, but use the segment defined by the coverage in the path family
        best.start = start;
        best.end = end;
        best.confidence = 1;
        structureSections.push(best);
    }*/
        newSection.pathFamily = section.pathFamily;
        pathFamilySections.push(newSection);
    });
    return pathFamilySections;
}

// multiply confidence?
// includes regular family
function getExtendedPathFamily(section, sampleDuration, groupID, pathSSM, strategy) {
    const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(pathSSM.getSampleAmount());

    const pathFamilySections = [];
    section.pathFamily.forEach((path, index) => {
        const start = path[path.length - 1][1] * sampleDuration;
        const end = (path[0][1] + 1) * sampleDuration;
        const pathConfidence = section.pathFamilyScores ? section.pathFamilyScores[index] : section.pathScores[index];

        const newSection = new Section({ start, end, groupID, confidence: pathConfidence });

        newSection.pathFamily = section.pathFamily;
        pathFamilySections.push(newSection);
    });

    pathFamilySections.forEach((familySection) => {
        const startInSamples = Math.floor(familySection.start / sampleDuration);
        const endInSamples = Math.floor(familySection.end / sampleDuration);

        const pathFamilyInfo = pathExtraction.computeSegmentPathFamilyInfo(
            pathSSM,
            startInSamples,
            endInSamples,
            scoreMatrixBuffer,
            strategy
        );
        pathFamilyInfo.pathFamily.forEach((path, index) => {
            const start = path[path.length - 1][1] * sampleDuration;
            const end = (path[0][1] + 1) * sampleDuration;

            const newSection = new Section({
                start,
                end,
                groupID,
                confidence: familySection.confidence * pathFamilyInfo.pathScores[index],
            });

            newSection.pathFamily = section.pathFamily;
            pathFamilySections.push(newSection);
        });
    });

    return pathFamilySections;
}

function pruneLowConfidence(sections, minConfidence) {
    const prunedSections = [];
    sections.forEach((section) => {
        if (section.confidence >= minConfidence) prunedSections.push(section);
    });
    return prunedSections;
}

function addNonOverlapping(sectionsA, sectionsB, overlapRatioThreshold = 0) {
    const allSections = [...sectionsA];

    const sortedSectionsB = sectionsB.sort((a, b) => (a.confidence > b.confidence ? 1 : -1));

    sortedSectionsB.forEach((sectionB) => {
        let mostOverlapRatio = 0;
        allSections.forEach((sectionA) => {
            if (sectionA.overlaps(sectionB)) {
                const durationA = sectionA.end - sectionA.start;
                const durationB = sectionB.end - sectionB.start;
                const overlap = computeOverlapSize(sectionA, sectionB);
                const overlapRatio = overlap / (durationA + durationB);
                if (overlapRatio > mostOverlapRatio) {
                    mostOverlapRatio = overlapRatio;
                }
            }
        });
        if (mostOverlapRatio > 0 && mostOverlapRatio < overlapRatioThreshold) {
            allSections.push(sectionB);
        } else if (mostOverlapRatio <= 0) {
            allSections.push(sectionB);
        }
    });

    return allSections;
}

function mergeOverlap(sections) {
    const mergedSections = [];

    sections.forEach((section) => {
        let indexToMergeWith = 0;
        const hasToMerge = mergedSections.some((mergedSection, index) => {
            // merge if middle is in section?
            if (section.overlaps(mergedSection)) {
                indexToMergeWith = index;
                return true;
            }
        });
        if (hasToMerge) {
            mergedSections[indexToMergeWith] = mergeSection(mergedSections[indexToMergeWith], section);
        } else {
            mergedSections.push(section);
        }
    });

    let overlapFound = true;
    let timeout = 1000;
    while (overlapFound || timeout < 0) {
        let overlapIndexA = 0;
        let overlapIndexB = 0;
        overlapFound = mergedSections.some((sectionA, indexA) => {
            return mergedSections.some((sectionB, indexB) => {
                if (sectionA.overlaps(sectionB) && sectionA !== sectionB) {
                    overlapIndexA = indexA;
                    overlapIndexB = indexB;
                    return true;
                }
            });
        });
        if (overlapFound) {
            const sectionA = mergedSections[overlapIndexA];
            const sectionB = mergedSections[overlapIndexB];
            const mergedSection = mergeSection(sectionA, sectionB);
            mergedSections.splice(overlapIndexB, 1);
            mergedSections[overlapIndexA] = mergedSection;
        }
        timeout--;
    }

    return mergedSections;
}

function mergeSection(sectionA, sectionB) {
    const start = Math.min(sectionA.start, sectionB.start);
    const end = Math.max(sectionA.end, sectionB.end);
    return new Section({ start, end, groupID: sectionA.groupID, confidence: sectionA.confidence });
}

function findBetterFit(
    pathSSM,
    section,
    sampleOffset = 4,
    comparisonProperty,
    strategy,
    structureSections = [],
    minDurationSeconds
) {
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

            if (
                start >= 0 &&
                end < sampleAmount &&
                endInSeconds - startInSeconds >= minDurationSeconds &&
                (allowOverlap ||
                    !overlapWithStructureSections({ start: startInSeconds, end: endInSeconds }, structureSections))
            ) {
                const segmentPathFamilyInfo = pathExtraction.computeSegmentPathFamilyInfo(
                    pathSSM,
                    start,
                    end,
                    scoreMatrixBuffer,
                    strategy
                );

                segmentPathFamilyInfo.start = start * sampleDuration;
                segmentPathFamilyInfo.end = end * sampleDuration;

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
    return structureSections.some((structureSection) => {
        if (section.overlaps(structureSection)) return true;
    });
}

function subtractStructureFromSegments(separateSegmentSets, sortedStructureSections, trackEnd, smallestAllowedSize) {
    let newSeparateSegmentSets = [];
    const allSegments = [].concat.apply([], separateSegmentSets);

    const freeRanges = getFreeRanges(sortedStructureSections, trackEnd, smallestAllowedSize);
    freeRanges.forEach((range) => {
        const rangeStart = range[0];
        const rangeEnd = range[1];
        let segmentSet = [];

        let previousBorder = rangeStart;
        allSegments.forEach((segment) => {
            if (segment.start > previousBorder && segment.start < rangeEnd) {
                segmentSet.push(
                    new Section({
                        start: previousBorder,
                        end: segment.start,
                    })
                );
                previousBorder = segment.start;
            }
        });
        segmentSet.push(
            new Section({
                start: previousBorder,
                end: rangeEnd,
            })
        );
        newSeparateSegmentSets.push(segmentSet);
    });

    return newSeparateSegmentSets;
}

function getFreeRangesNonOverlapping(structureSections, trackEnd, smallestAllowedSize) {
    const freeRanges = [];
    let previousEnd = 0;
    structureSections.forEach((section) => {
        freeRanges.push([previousEnd, section.start]);
        previousEnd = section.end;
    });
    freeRanges.push([previousEnd, trackEnd]);
    return freeRanges.filter((range) => range[1] - range[0] >= smallestAllowedSize);
}

function getFreeRanges(structureSections, trackEnd, smallestAllowedSize) {
    const freeRanges = [[0, trackEnd]];
    structureSections.forEach((section) => {
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
        });
    });
    return freeRanges.filter((range) => range[1] - range[0] >= smallestAllowedSize);
}

/**
 * Picks highest similarity pair, groupIDs segments not yet groupIDed, repeat
 * @param {*} segments
 */
export function groupSimilarSegments(segments, pathSSM, maxDistance = 0.8) {
    const groupedSegments = _.cloneDeep(segments);
    groupedSegments.forEach((segment) => {
        delete segment.groupID;
        segment.confidence = 1;
    });

    let groupIDed = 0;
    let newGroupID = 0;
    while (groupIDed < segments.length) {
        let minDistance = Number.POSITIVE_INFINITY;
        let bestSegmentA = null;
        let bestSegmentB = null;
        groupedSegments.forEach((segmentA) => {
            groupedSegments.forEach((segmentB) => {
                if ((segmentA.groupID === undefined || segmentB.groupID === undefined) && segmentA !== segmentB) {
                    const distance = pathExtraction.getDistanceBetween(segmentA, segmentB, pathSSM);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestSegmentA = segmentA;
                        bestSegmentB = segmentB;
                    }
                }
            });
        });
        if (!bestSegmentA || !bestSegmentB) {
            break;
        }
        if (minDistance > maxDistance) {
            if (bestSegmentA.groupID === undefined && bestSegmentB.groupID === undefined) {
                bestSegmentA.groupID = newGroupID;
                newGroupID++;
                bestSegmentB.groupID = newGroupID;
            } else if (bestSegmentA.groupID === undefined) {
                bestSegmentA.groupID = newGroupID;
            } else if (bestSegmentB.groupID === undefined) {
                bestSegmentB.groupID = newGroupID;
            }
            newGroupID++;
        } else {
            if (bestSegmentA.groupID === undefined && bestSegmentB.groupID === undefined) {
                bestSegmentA.groupID = newGroupID;
                bestSegmentB.groupID = newGroupID;
                newGroupID++;
            } else if (bestSegmentA.groupID === undefined) {
                bestSegmentA.groupID = bestSegmentB.groupID;
                bestSegmentA.confidence = 1 - minDistance;
            } else if (bestSegmentB.groupID === undefined) {
                bestSegmentB.groupID = bestSegmentA.groupID;
                bestSegmentB.confidence = 1 - minDistance;
            }
        }
    }
    return groupedSegments;
}

export function MDSColorSegments(segments, pathSSM, strategy = "overlap", coloringStrategy) {
    if (segments.length === 0) return segments;

    const distanceMatrix = pathExtraction.getDistanceMatrix(segments, pathSSM, strategy);
    return MDSColorGivenDistanceMatrix(segments, distanceMatrix, coloringStrategy);
}

export function MDSColorSegmentsPerGroup(segments, pathSSM, strategy = "overlap", coloringStrategy) {
    if (segments.length === 0) return segments;

    const segmentGroups = [];
    segments.forEach((segment) => {
        if (!segmentGroups[segment.groupID]) {
            segmentGroups[segment.groupID] = [];
        }
        segmentGroups[segment.groupID].push(segment);
    });

    const coloredSegments = [];
    segmentGroups.forEach((segmentGroup) => {
        const distanceMatrix = pathExtraction.getDistanceMatrix(segmentGroup, pathSSM, strategy);
        const distanceMatrixPlus = new HalfMatrix({
            size: segmentGroup.length + 1,
            numberType: HalfMatrix.NumberType.FLOAT32,
        });
        distanceMatrixPlus.fill((x, y) => {
            if (x >= segmentGroup.length || y >= segmentGroup.length) {
                if (x === y) {
                    return 0;
                }
                return 1;
            }
            return Math.pow(distanceMatrix.getValue(x, y), 4);
        });
        const groupSegmentsColored = MDSColorGivenDistanceMatrix(segmentGroup, distanceMatrix, coloringStrategy);
        coloredSegments.push(...groupSegmentsColored);
    });
    return coloredSegments;
}

export function MDSColorGivenDistanceMatrix(segments, distanceMatrix, coloringStrategy) {
    const coloredSegments = [];
    const MdsCoordinates = mds.getMdsCoordinates(distanceMatrix, coloringStrategy);
    const MdsFeature = mds.getMDSFeature(distanceMatrix);

    segments.forEach((segment, index) => {
        const [angle, radius] = mds.getAngleAndRadius(MdsCoordinates[index]);
        const newSegment = segment.clone();
        newSegment.colorAngle = angle;
        newSegment.colorRadius = radius;
        newSegment.mdsFeature = MdsFeature[index];
        coloredSegments.push(newSegment);
    });

    // sort from small to high
    coloredSegments.sort((a, b) => {
        return a.colorAngle > b.colorAngle ? 1 : b.colorAngle > a.colorAngle ? -1 : 0;
    });

    let largestGap = 1 - coloredSegments[coloredSegments.length - 1].colorAngle + coloredSegments[0].colorAngle;
    let largestGapAngle = coloredSegments[0].colorAngle;
    for (let i = 1; i < coloredSegments.length; i++) {
        const gap = coloredSegments[i].colorAngle - coloredSegments[i - 1].colorAngle;
        if (gap > largestGap) {
            largestGap = gap;
            largestGapAngle = coloredSegments[i].colorAngle;
        }
    }

    coloredSegments.forEach((segment) => {
        segment.colorAngle = (1 + (segment.colorAngle - largestGapAngle)) % 1;
    });

    return coloredSegments;
}

export function MDSIntuitionFlip(coloredSamples, timbreFeatures) {
    const loudness = similarity.correlate(
        coloredSamples,
        timbreFeatures.map((val) => val[0])
    );
    const darkness = similarity.correlate(
        coloredSamples,
        timbreFeatures.map((val) => val[1])
    );
    const mids = similarity.correlate(
        coloredSamples,
        timbreFeatures.map((val) => val[2])
    );
    const attack = similarity.correlate(
        coloredSamples,
        timbreFeatures.map((val) => val[3])
    );

    log.debug("loudness", loudness, "darkness", darkness, "mids", mids, "attack", attack);

    if (Math.sign(loudness) > 0 && Math.sign(darkness) < 0) {
        return coloredSamples;
    }

    // By default the graph should display high loudness as high value
    if (Math.sign(loudness) < 0) {
        return coloredSamples.map((val) => 1 - val);
    }

    // If graph depicts mostly darkness, we want bright sounds to have a high value
    if (Math.sign(darkness) > 0 && Math.abs(darkness) > 2 * Math.abs(loudness)) {
        return coloredSamples.map((val) => 1 - val);
    }

    return coloredSamples;
}

export function computeOverlapSize(a, b) {
    if (a.start <= b.start && a.end > b.start) return a.end - b.start;
    if (b.start <= a.start && b.end > a.start) return b.end - a.start;
    if (a.start < b.start && a.end >= b.end) return b.end - b.start;
    if (b.start < a.start && b.end >= a.end) return a.end - a.start;
    if (a.start >= b.start && a.end <= b.end) return a.end - a.start;
    if (b.start >= a.start && b.end <= a.end) return b.end - b.start;
    return 0;
}

export function disjoint(a, b) {
    return a.start >= b.end || a.end <= b.start;
}

export function isSameSectionWithinError(a, b, errorInSamples) {
    const middleA = a.start + a.getDuration() / 2;
    const middleB = b.start + b.getDuration() / 2;
    return Math.abs(middleB - middleA) < errorInSamples;
}

export function fillGapSingle(squashedSections, section) {
    let newSection = section.clone();

    // If any of the squashed sections will split or completely cover the section, don't add it
    squashedSections.forEach((squashedSection) => {
        if (squashedSection.splits(section)) return squashedSections;
        if (squashedSection.covers(section)) return squashedSections;
    });

    // Cut off the ends
    squashedSections.forEach((squashedSection) => {
        if (squashedSection.splits(newSection)) return squashedSections;
        if (squashedSection.covers(newSection)) return squashedSections;
        newSection = newSection.subtract(squashedSection);
    });

    squashedSections.push(newSection);
    return squashedSections;
}

export function squash(strategy, sections, groupAmount, minSize = 2) {
    const squashed = [];
    const maxGroups = 10;

    for (let i = 0; i < groupAmount && i < maxGroups; i++) {
        const groupIDSections = sections.filter((section) => section.groupID === i);
        groupIDSections.forEach((groupSection) => {
            if (strategy === "no-overlap") {
                const overlap = squashed.some((squashedSection) => {
                    if (groupSection.overlaps(squashedSection)) return true;
                });
                if (!overlap) {
                    squashed.push(groupSection);
                }
            } else if (strategy === "overwrite") {
                let overlap = false;
                squashed.forEach((squashedSection, index) => {
                    if (groupSection.overlaps(squashedSection) && squashedSection !== groupSection) {
                        overlap = true;
                        if (
                            squashedSection.start < groupSection.start &&
                            squashedSection.end > groupSection.end &&
                            groupSection.confidence > squashedSection.confidence
                        ) {
                            // split squashed
                            const squashedSectionBefore = squashedSection.clone();
                            const squashedSectionAfter = squashedSection.clone();
                            squashedSectionBefore.end = groupSection.start;
                            squashedSectionAfter.start = groupSection.end;
                            squashed[index] = squashedSectionBefore;
                            squashed.push(squashedSectionAfter);
                            squashed.push(groupSection.clone());
                        } else if (
                            squashedSection.start < groupSection.start &&
                            squashedSection.end > groupSection.start &&
                            squashedSection.end <= groupSection.end &&
                            groupSection.confidence > squashedSection.confidence
                        ) {
                            // groupID cuts off squashed end
                            squashedSection.end = groupSection.start;
                            squashed.push(groupSection.clone());
                        } else if (
                            groupSection.start <= squashedSection.start &&
                            groupSection.end > squashedSection.start &&
                            groupSection.end < squashedSection.end &&
                            groupSection.confidence > squashedSection.confidence
                        ) {
                            // groupID cuts off squashed start
                            squashedSection.start = groupSection.end;
                            squashed.push(groupSection.clone());
                        } else if (
                            groupSection.start < squashedSection.start &&
                            groupSection.end > squashedSection.end
                        ) {
                            // groupID is bigger than squashed  TBD
                        }
                    }
                });
                if (!overlap) {
                    squashed.push(groupSection.clone());
                }
            } else if (strategy === "smart-overwrite") {
                squashed.forEach((squashedSection) => {
                    if (groupSection.overlaps(squashedSection)) {
                        // align ends
                        if (squashedSection.start < groupSection.start && squashedSection.end > groupSection.end) {
                            // split squashed
                        }
                    }
                });
            } else if (strategy === "fill-gap") {
                fillGapSingle(squashed, groupSection);
            } else if (strategy === "fill-gap-old") {
                let thereIsSpace = true;
                const newGroupSection = groupSection.clone();
                squashed.forEach((squashedSection, index) => {
                    if (groupSection.overlaps(squashedSection) && squashedSection !== groupSection) {
                        if (squashedSection.start < groupSection.start && squashedSection.end > groupSection.end) {
                            // no gap
                            thereIsSpace = false;
                        } else if (
                            squashedSection.start < groupSection.start &&
                            squashedSection.end > groupSection.start &&
                            squashedSection.end <= groupSection.end
                        ) {
                            // groupID is cut off by squashed end
                            newGroupSection.start = squashedSection.end;
                        } else if (
                            groupSection.start <= squashedSection.start &&
                            groupSection.end > squashedSection.start &&
                            groupSection.end < squashedSection.end
                        ) {
                            // groupID is cut off by squashed start
                            newGroupSection.end = squashedSection.start;
                        } else if (
                            groupSection.start < squashedSection.start &&
                            groupSection.end > squashedSection.end
                        ) {
                            // groupID is bigger than squashed  TBD
                            thereIsSpace = false;
                        }
                    }
                    if (newGroupSection.end <= newGroupSection.start) {
                        thereIsSpace = false;
                    }
                });
                if (thereIsSpace && newGroupSection.end - newGroupSection.start > minSize) {
                    squashed.push(newGroupSection);
                }
            }
        });
    }

    return squashed;
}

export function MDSColorTimbreSegmentsWithSSM(blurredTimbreSSM, segments) {
    const amount = segments.length;
    const distanceMatrix = new HalfMatrix({ size: amount, numberType: HalfMatrix.NumberType.FLOAT32 });

    const segmentVectors = [];
    segments.forEach((segment) => {
        const middleSeconds = segment.start + segment.getDuration() / 2;
        const middleSample = Math.floor(middleSeconds / blurredTimbreSSM.getSampleDuration());
        const segmentVector = blurredTimbreSSM.getColumnNormalized(middleSample);
        segmentVectors.push(segmentVector);
    });

    distanceMatrix.fill((x, y) => {
        return similarity.cosine(segmentVectors[x], segmentVectors[y]);
    });

    return MDSColorGivenDistanceMatrix(segments, distanceMatrix);
}

export function MDSColorTimbreSegmentsWithFeatures(timbreFeatures, segments, sampleDuration) {
    const amount = segments.length;
    const distanceMatrix = new HalfMatrix({ size: amount, numberType: HalfMatrix.NumberType.FLOAT32 });

    const segmentVectors = [];
    segments.forEach((segment) => {
        const vector = new Float32Array(12).fill(0);

        const startSample = Math.floor(segment.start / sampleDuration);
        const endSample = Math.floor(segment.end / sampleDuration);
        const sampleAmount = endSample - startSample;
        for (let i = startSample; i < endSample; i++) {
            for (let f = 0; f < 12; f++) {
                vector[f] += timbreFeatures[i][f];
            }
        }
        for (let f = 0; f < 12; f++) {
            vector[f] /= sampleAmount;
        }
        segmentVectors.push(vector);
    });

    distanceMatrix.fill((x, y) => {
        return similarity.cosine(segmentVectors[x], segmentVectors[y]);
    });

    return MDSColorGivenDistanceMatrix(segments, distanceMatrix);
}

export function MDSColorTimbreSamples(timbreFeatures) {
    const amount = timbreFeatures.length;
    const distanceMatrix = new HalfMatrix({ size: amount, numberType: HalfMatrix.NumberType.FLOAT32 });
    distanceMatrix.fill((x, y) => {
        return similarity.cosine(timbreFeatures[x], timbreFeatures[y]);
    });
    //const MdsCoordinates = mds.getMdsCoordinates(distanceMatrix);
    const MdsFeature = mds.getMDSFeature(distanceMatrix);

    const coloredSamples = [];

    for (let i = 0; i < amount; i++) {
        coloredSamples.push(MdsFeature[i]);
    }

    return coloredSamples;
}

export function clusterTimbreSegmentsWithFeatures(timbreFeatures, segments, sampleDuration) {
    const coloredSegments = [];

    const segmentVectors = [];
    segments.forEach((segment) => {
        const vector = new Float32Array(12).fill(0);

        const startSample = Math.floor(segment.start / sampleDuration);
        const endSample = Math.floor(segment.end / sampleDuration);
        const sampleAmount = endSample - startSample;
        for (let i = startSample; i < endSample; i++) {
            for (let f = 0; f < 12; f++) {
                vector[f] += timbreFeatures[i][f];
            }
        }
        for (let f = 0; f < 12; f++) {
            vector[f] /= sampleAmount;
        }
        segmentVectors.push(vector);
    });
    const clusteringResult = clustering.kMeansSearch(segmentVectors, 1, 10, 5);

    segments.forEach((segment, index) => {
        const cluster = clusteringResult.idxs[index];
        const newSegment = segment.clone();
        newSegment.groupID = cluster;
        newSegment.confidence = 1;
        coloredSegments.push(newSegment);
    });

    return coloredSegments;
}
export function processTimbreSegments(timbreFeatures, segments, sampleDuration) {
    const mdsColoredSegments = MDSColorTimbreSegmentsWithFeatures(timbreFeatures, segments, sampleDuration);
    //log.debug("Clustering timbre segments")
    //const clusteredSegments = clusterTimbreSegmentsWithFeatures(timbreFeatures, mdsColoredSegments, sampleDuration);
    //log.debug("Clustered timbre segments")
    return mdsColoredSegments;
}

function fitnessSort(a, b) {
    if (a.fitness < b.fitness) {
        return 1;
    }
    if (a.fitness > b.fitness) {
        return -1;
    }
    return 0;
}

function createCandidate(pathSSM, start, end, scoreMatrixBuffer, strategy, groupID) {
    const segmentPathFamilyInfo = pathExtraction.computeSegmentPathFamilyInfo(
        pathSSM,
        start,
        end,
        scoreMatrixBuffer,
        strategy
    );
    const startInSeconds = start * pathSSM.sampleDuration;
    const endInSeconds = end * pathSSM.sampleDuration;
    const candidate = new Section({ start: startInSeconds, end: endInSeconds, groupID: groupID });
    candidate.pathFamily = segmentPathFamilyInfo.pathFamily;
    candidate.pathFamilyScores = segmentPathFamilyInfo.pathScores;
    candidate.score = segmentPathFamilyInfo.score;
    candidate.normalizedScore = segmentPathFamilyInfo.normalizedScore;
    candidate.coverage = segmentPathFamilyInfo.coverage;
    candidate.normalizedCoverage = segmentPathFamilyInfo.normalizedCoverage;
    candidate.fitness = segmentPathFamilyInfo.fitness;
    return candidate;
}

// Remove B from A
// Creates new array, doesn't edit A
export function subtractSegments(segmentsA, segmentsB) {
    const newSegmentsA = segmentsA.map((a) => a.clone());

    segmentsB.forEach((b) => {
        let i = 0;
        while (i < newSegmentsA.length) {
            const a = newSegmentsA[i];
            if (a.overlaps(b)) {
                if (b.start > a.start && b.end < a.end) {
                    const leftSize = b.start - a.start;
                    const rightSize = a.end - b.end;
                    const keepLeft = leftSize > 0;
                    const keepRight = rightSize > 0;
                    if (keepLeft && keepRight) {
                        const clonedGroupSection = a.clone();
                        a.end = b.start;
                        clonedGroupSection.start = b.end;
                        newSegmentsA.push(clonedGroupSection);
                    } else if (keepLeft) {
                        newSegmentsA[i].end = b.start;
                    } else if (keepRight) {
                        newSegmentsA[i].start = b.end;
                    }
                } else if (b.start > a.start && b.end >= a.end) {
                    newSegmentsA[i].end = b.start;
                } else if (b.start <= a.start && b.end < a.end) {
                    newSegmentsA[i].start = b.end;
                }
            }

            if (b.start <= a.start && b.end >= a.end) {
                newSegmentsA.splice(i, 1);
            } else {
                i++;
            }
        }
    });

    return newSegmentsA;
}

export function sortGroupByCoverage(sections) {
    const newSections = [];

    let groupCoverage = [];
    sections.forEach((section) => {
        if (groupCoverage[section.groupID] === undefined) {
            groupCoverage[section.groupID] = { groupID: section.groupID, coverage: section.end - section.start };
        } else {
            groupCoverage[section.groupID].coverage += section.end - section.start;
        }
    });

    groupCoverage = groupCoverage.sort((a, b) => b.coverage - a.coverage);
    sections.forEach((section) => {
        const newGroup = groupCoverage.findIndex((group) => group.groupID === section.groupID);
        const newSection = section.clone();
        newSection.groupID = newGroup;
        newSections.push(newSection);
    });

    return newSections;
}

function sortGroupByFirstOccuring(sections) {
    const newSections = [];
    sections = sections.sort((a, b) => (a.start > b.start ? 1 : -1));

    // index is groupID of new sections
    const mapping = [];
    sections.forEach((section) => {
        let newGroup = mapping.indexOf(section.groupID);
        if (newGroup === -1) {
            mapping.push(section.groupID);
            newGroup = mapping.length - 1;
        }
        const newSection = section.clone();
        newSection.groupID = newGroup;
        newSections.push(newSection);
    });

    return newSections;
}

export function createSeparators(coloredSegments, pathSSM) {
    const coloredSegmentsSorted = coloredSegments.sort((a, b) => a.start - b.start);
    const separators = [];

    for (let i = 0; i < coloredSegments.length; i++) {
        const segment = coloredSegmentsSorted[i];

        let distanceFromPreviousSegment = 1;
        if (i > 0) {
            distanceFromPreviousSegment = pathExtraction.getDistanceBetween(
                segment,
                coloredSegmentsSorted[i - 1],
                pathSSM
            );
            const angleDistance = Math.abs(segment.colorAngle - coloredSegmentsSorted[i - 1].colorAngle);
            distanceFromPreviousSegment = Math.min(angleDistance, 1 - angleDistance) * 2;
        }

        const separator = {
            start: segment.start,
            end: segment.end,
            duration: segment.end - segment.start,
            colorAngle: segment.colorAngle,
            colorRadius: segment.colorRadius,
            confidence: distanceFromPreviousSegment,
        };
        separators.push(separator);
    }

    return separators;
}
