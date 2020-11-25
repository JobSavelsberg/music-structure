import * as noveltyDetection from "./noveltyDetection";
import * as log from "../dev/log";
import * as pathExtraction from "./pathExtraction"
export function createSectionsFromNovelty(novelty, sampleDuration, threshold) {
    log.debug("Create sections from novelty");
    const maxima = noveltyDetection.findLocalMaxima(novelty, threshold);

    const structureSections = [];

    for (let i = 0; i < maxima.length; i++) {
        const maximaIndex = maxima[i];
        const start = maximaIndex * sampleDuration;
        const nextMaximaStart =
            i < maxima.length - 1 ? sampleDuration * maxima[i + 1] : sampleDuration * novelty.length;

        const duration = nextMaximaStart - start;
        const confidence = novelty[maximaIndex];
        structureSections.push({
            start,
            duration,
            confidence,
        });
    }
    return structureSections;
}


export function computeStructureCandidates(pathSSM, structureSections, minDurationSeconds = 5, maxRatio = 0.4){
    const sampleAmount = pathSSM.getSampleAmount();
    const sectionAmount = structureSections.length;
    const sampleDuration = pathSSM.sampleDuration;
    const maxLength = maxRatio*sampleAmount*sampleDuration;
    const scoreMatrix = pathExtraction.createScoreMatrixBuffer(sampleAmount);

    log.info("Calculating fitness for:", sectionAmount*sectionAmount/2, "candidate sections");

    const candidates = [];

    for(let start = 0; start < sectionAmount; start++){
        for(let end = start+1; end < sectionAmount; end++){
            const startInSeconds = structureSections[start].start;
            const endInSeconds = structureSections[end].start;
            const segmentLengthInSeconds = endInSeconds - startInSeconds ;
            if(segmentLengthInSeconds< minDurationSeconds || segmentLengthInSeconds > maxLength) continue;
            const startInSamples = Math.floor(startInSeconds / sampleDuration);
            const endInSamples = Math.floor(endInSeconds / sampleDuration);
            const width = endInSamples - startInSamples+2;
            const {P, score} = pathExtraction.extractPathFamily(pathSSM, startInSamples, endInSamples, scoreMatrix)
            const {
                fitness,
                normalizedScore,
                coverage,
                normalizedCoverage,
                pathFamilyLength,
            } = pathExtraction.computeFitness(P, score, sampleAmount, width);
            const pathFamily = [];
            P.forEach(path => {
                const pathCoords = [];
                for(let i =0; i< path.length; i+=2){
                    const x = startInSamples+path[i];
                    const y = path[i+1];
                    pathCoords.push([x, y]);
                }
                pathFamily.push(pathCoords);
            })
            
            candidates.push({
                start: startInSeconds,
                duration: segmentLengthInSeconds,
                end: endInSeconds,
                label: candidates.length,
                score: score,
                normalizedScore: normalizedScore,
                coverage: coverage,
                normalizedCoverage: normalizedCoverage,
                fitness: fitness,
                pathFamily: pathFamily,
            })

        }
    }

    return candidates;
}

export function findGreedyDecomposition(structureCandidates, sampleDuration, property="fitness"){
    const structure = [];
    log.debug("Finding greedy Decomposition")
    let candidates = structureCandidates.sort((a, b) => a[property] > b[property] ? 1 : -1);

    while(candidates.length > 0){
        const best = candidates.pop();
        const label =  structure.length;
        best.label = label;
        structure.push(best);
        // TODO: try to find higher score by nudging sides
        // put path family in there
        best.pathFamily.forEach(path => {
            const start = path[path.length-1][1]*sampleDuration;
            const end = path[0][1]*sampleDuration;
            const duration = end - start;
            const section = {start, end, duration, label}
            if(disjoint(best, section)){
                structure.push(section);
            }
        })
        log.debug("Structure", structure)
        break;
        /*candidates = candidates.filter((section) => {
            // Delete overlapping segments
            const isOverlapping = overlaps(section, best);
            return disjoint(section, best);
        });*/

    }
    return structure;
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