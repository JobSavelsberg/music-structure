import * as log from "../dev/log";

import Isophonics_1 from "../data/testing/Isophonics/Isophonics_1.json";
import Isophonics_01 from "../data/testing/Isophonics/Isophonics_01.json";
import Isophonics_2 from "../data/testing/Isophonics/Isophonics_2.json";
import Isophonics_02 from "../data/testing/Isophonics/Isophonics_02.json";
import Isophonics_03 from "../data/testing/Isophonics/Isophonics_03.json";
import Isophonics_04 from "../data/testing/Isophonics/Isophonics_04.json";
import Isophonics_05 from "../data/testing/Isophonics/Isophonics_05.json";
import Isophonics_06 from "../data/testing/Isophonics/Isophonics_06.json";
import Isophonics_07 from "../data/testing/Isophonics/Isophonics_07.json";
import Isophonics_08 from "../data/testing/Isophonics/Isophonics_08.json";
import Isophonics_09 from "../data/testing/Isophonics/Isophonics_09.json";
import Isophonics_10 from "../data/testing/Isophonics/Isophonics_10.json";
import Isophonics_11 from "../data/testing/Isophonics/Isophonics_11.json";
import Isophonics_12 from "../data/testing/Isophonics/Isophonics_12.json";
import Isophonics_13 from "../data/testing/Isophonics/Isophonics_13.json";
import Isophonics_14 from "../data/testing/Isophonics/Isophonics_14.json";
import Isophonics_15 from "../data/testing/Isophonics/Isophonics_15.json";
import Isophonics_16 from "../data/testing/Isophonics/Isophonics_16.json";
import Isophonics_17 from "../data/testing/Isophonics/Isophonics_17.json";
import Isophonics_18 from "../data/testing/Isophonics/Isophonics_18.json";
import Isophonics_CD1 from "../data/testing/Isophonics/Isophonics_CD1.json";
import Isophonics_CD2 from "../data/testing/Isophonics/Isophonics_CD2.json";

const dataPath = "../data/testing/";

export const namespaces = {
    coarse: ["segment_open", "segment_salami_upper"],
    function: ["segment_open", "segment_salami_function"],
    fine: ["chord", "segment_salami_lower"],
    chord: ["chord"],
    key: ["key_mode"],
    beat: ["beat"],
};

export function getAllTestSets() {
    return Object.keys(sets);
}

export function getTracks(setKey) {
    const set = sets[setKey].data;
    let tracks = [];
    for (const track of set) {
        track.query = getQuery(track);
        tracks.push(track);
    }
    return tracks;
}

function getQuery(track) {
    let query = track.file_metadata.artist + track.file_metadata.title;
    query = query.replace(/_/g, " ");
    query = query.replace(/\d/g, "");
    query = query.replace(/-/g, "");
    return query;
}

export function getSpotifySearch(set) {}

function readTextFile(file) {
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                var allText = rawFile.responseText;
                alert(allText);
            }
        }
    };
    rawFile.send(null);
}

export const sets = {
    "Isophonics 1a": { folder: "Isophonics", prefix: "Isophonics_1", data: Isophonics_1 },
    "Isophonics 1b": { folder: "Isophonics", prefix: "Isophonics_01", data: Isophonics_01 },
    "Isophonics 2a": { folder: "Isophonics", prefix: "Isophonics_2", data: Isophonics_2 },
    "Isophonics 2b": { folder: "Isophonics", prefix: "Isophonics_02", data: Isophonics_02 },
    "Isophonics 3": { folder: "Isophonics", prefix: "Isophonics_03", data: Isophonics_03 },
    "Isophonics 4": { folder: "Isophonics", prefix: "Isophonics_04", data: Isophonics_04 },
    "Isophonics 5": { folder: "Isophonics", prefix: "Isophonics_05", data: Isophonics_05 },
    "Isophonics 6": { folder: "Isophonics", prefix: "Isophonics_06", data: Isophonics_06 },
    "Isophonics 7": { folder: "Isophonics", prefix: "Isophonics_07", data: Isophonics_07 },
    "Isophonics 8": { folder: "Isophonics", prefix: "Isophonics_08", data: Isophonics_08 },
    "Isophonics 9": { folder: "Isophonics", prefix: "Isophonics_09", data: Isophonics_09 },
    "Isophonics 10": { folder: "Isophonics", prefix: "Isophonics_10", data: Isophonics_10 },
    "Isophonics 11": { folder: "Isophonics", prefix: "Isophonics_11", data: Isophonics_11 },
    "Isophonics 12": { folder: "Isophonics", prefix: "Isophonics_12", data: Isophonics_12 },
    "Isophonics 13": { folder: "Isophonics", prefix: "Isophonics_13", data: Isophonics_13 },
    "Isophonics 14": { folder: "Isophonics", prefix: "Isophonics_14", data: Isophonics_14 },
    "Isophonics 15": { folder: "Isophonics", prefix: "Isophonics_15", data: Isophonics_15 },
    "Isophonics 16": { folder: "Isophonics", prefix: "Isophonics_16", data: Isophonics_16 },
    "Isophonics 17": { folder: "Isophonics", prefix: "Isophonics_17", data: Isophonics_17 },
    "Isophonics 18": { folder: "Isophonics", prefix: "Isophonics_18", data: Isophonics_18 },
    "Isophonics CD1": { folder: "Isophonics", prefix: "Isophonics_CD1", data: Isophonics_CD1 },
    "Isophonics CD2": { folder: "Isophonics", prefix: "Isophonics_CD2", data: Isophonics_CD2 },
};
