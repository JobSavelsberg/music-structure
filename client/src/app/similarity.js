import * as log from "../dev/log";
export const measures = {
    EUCLIDIAN: "euclidian",
    MANHATTAN: "manhattan",
    COSINE: "cosine",
};

export function cosine(a, b) {
    var adotv = 0;
    var amag = 0;
    var bmag = 0;
    for (var i = 0; i < a.length; i++) {
        adotv += a[i] * b[i];
        amag += a[i] * a[i];
        bmag += b[i] * b[i];
    }
    amag = Math.sqrt(amag);
    bmag = Math.sqrt(bmag);
    return adotv / (amag * bmag);
}

export function cosineTransposed(a, b, p) {
    var adotv = 0;
    var amag = 0;
    var bmag = 0;
    for (var i = 0; i < a.length; i++) {
        let transposedI = (i + p) % 12;
        adotv += a[i] * b[transposedI];
        amag += a[i] * a[i];
        bmag += b[transposedI] * b[transposedI];
    }
    amag = Math.sqrt(amag);
    bmag = Math.sqrt(bmag);
    return adotv / (amag * bmag);
}

export function manhattanDistance(a, b) {
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
        dist += Math.abs(a[i] - b[i]);
    }
    return dist;
}
// Manhattan distance scaled back to [0,1]
export function manhattan(a, b, range) {
    return 1 - this.manhattanDistance(a, b) / range;
}

export function euclidianDistance(a, b) {
    return Math.sqrt(squaredDistance(a, b));
}
export function maxEuclidianDistance(length, range) {
    return Math.sqrt(range * range * length);
}
export function euclidian(a, b, maxDist) {
    return 1 - euclidianDistance(a, b) / maxDist;
}

export function squaredDistance(a, b) {
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        dist += diff * diff;
    }
    return dist;
}
