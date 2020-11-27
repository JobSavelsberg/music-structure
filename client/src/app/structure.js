import * as noveltyDetection from "./noveltyDetection";
import * as log from "../dev/log";
import * as pathExtraction from "./pathExtraction";

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


export function computeStructureCandidates(pathSSM, structureSegments, minDurationSeconds = 5, maxRatio = 0.4){
    const sampleAmount = pathSSM.getSampleAmount();
    const segmentAmount = structureSegments.length;
    const sampleDuration = pathSSM.sampleDuration;
    const maxLength = maxRatio*sampleAmount*sampleDuration;
    const scoreMatrixBuffer = pathExtraction.createScoreMatrixBuffer(sampleAmount);
    const candidates = [];

    for(let start = 0; start < segmentAmount; start++){
        for(let end = start; end < segmentAmount; end++){

            const startInSeconds = structureSegments[start].start;
            const endInSeconds = structureSegments[end].end;
            const segmentLengthInSeconds = endInSeconds - startInSeconds ;
            if(segmentLengthInSeconds< minDurationSeconds || segmentLengthInSeconds > maxLength) continue;
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

export function computeSeparateStructureCandidates(pathSSM, separateSegmentSets, minDurationSeconds = 4, maxRatio = 0.4){
    const separateCandidateSets = []
    separateSegmentSets.forEach(segments => {
        const candidates = computeStructureCandidates(pathSSM, segments, minDurationSeconds, maxRatio);
        separateCandidateSets.push(candidates);
    })

    return separateCandidateSets;
}

// Structure is not sorted, structuresegments is
export function findGreedyDecomposition(pathSSM, structureSegments, sampleDuration, comparisonProperty="fitness"){
    const structureSections = [];
    log.debug("Finding greedy Decomposition")
    let separateSegmentSets = [structureSegments];
    
    let i = 0;
    const maxRepeats = 5;
    while(separateSegmentSets.length > 0 && i < maxRepeats){
        let separateCandidateSets = computeSeparateStructureCandidates(pathSSM, separateSegmentSets)
        const allCandidates = [].concat.apply([], separateCandidateSets);
        if(allCandidates.length === 0){
            break;
        }
        const allCandidatesSorted = allCandidates.sort((a, b) => a[comparisonProperty] > b[comparisonProperty] ? 1 : -1);

        const best = allCandidatesSorted.pop();
        const label =  i;
        best.label = label;
        // TODO: try to find higher score by nudging sides

        best.pathFamily.forEach(path => {
            const start = path[path.length-1][1]*sampleDuration;
            const end = (path[0][1]+1)*sampleDuration;
            const duration = end - start;
            const section = {start, end, duration, label}
            if(!isSameSectionWithinError(best, section, 2)){
                structureSections.push(section);
            }else{
                // It's the best path itself, but use the segment defined by the coverage in the path family
                best.start = start;
                best.end = end;
                best.duration = duration;
                structureSections.push(best);
            }
        })
        separateSegmentSets = subtractStructureFromSegments(separateSegmentSets, structureSections);
        i++;
    }
    return [structureSections, i];
}

function subtractStructureFromSegments(separateSegmentSets, structureSections){
    let newSeparateSegmentSets = [];
    const structureSectionsLeftToHit = [...structureSections];
    const allSegments = [].concat.apply([], separateSegmentSets);

    let segmentSet = [];
    let startAddingTime = 0;
    allSegments.forEach(segment => {
        if(segment.start >= startAddingTime){
            segmentSet.push(segment);
        }
        structureSectionsLeftToHit.some((section, index) => {
            // Check if a segment hits the structure section
            if(segment.end >= section.start){
                // clip the end of the last segment
                segment.end = section.start;
                startAddingTime = section.end;

                // remove structure section
                structureSectionsLeftToHit.splice(index, 1);
                if(segmentSet.length > 0){
                    newSeparateSegmentSets.push(segmentSet);
                    segmentSet = [];
                }
                return true;
            }
        })
    })
    if(segmentSet.length > 0){
        newSeparateSegmentSets.push(segmentSet);
    }
    return newSeparateSegmentSets;
}

export function overlaps(a, b){
    return (a.start <= b.start && a.end >= b.end) ||
    (a.start >= b.start && a.end <= b.end) ||
    (a.end >= b.start && a.end < b.end) ||
    (a.start > b.start && a.start <= b.end)
}

export function disjoint(a, b){
    return a.start >= b.end || a.end <= b.start
}

export function isSameSectionWithinError(a, b, errorInSamples){
    const middleA = a.start+a.duration/2;
    const middleB = b.start+b.duration/2;
    return Math.abs(middleB-middleA) < errorInSamples
}