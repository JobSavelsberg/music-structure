import * as noveltyDetection from "./noveltyDetection";
import * as log from "../dev/log";

export function createSectionsFromNovelty(novelty, sampleDuration) {
    log.debug("Create sections from novelty");
    const maxima = noveltyDetection.findLocalMaxima(novelty);

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
