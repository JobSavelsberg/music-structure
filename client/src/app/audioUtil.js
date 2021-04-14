import * as log from "../dev/log";

const d3 = require("d3");
export const circleOfFifths = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // Starting from C=0
export const noteNames = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const keyNames = [
    "C",
    "D♭",
    "D",
    "E♭",
    "E",
    "F",
    "F♯",
    "G",
    "A♭",
    "A",
    "B♭",
    "B",
    "Cm",
    "D♭m",
    "Dm",
    "E♭m",
    "Em",
    "Fm",
    "F♯m",
    "Gm",
    "A♭m",
    "Am",
    "B♭m",
    "Bm",
];

//https://www.vectorstock.com/royalty-free-vector/color-wheel-spectrum-scheme-selection-color-vector-25483441
export const colorWheelOld = d3
    .scaleLinear()
    .domain([
        0,
        1 / 12,
        2 / 12,
        2.8 / 12,
        3.8 / 12,
        4.3 / 12,
        5.3 / 12,
        6.8 / 12,
        8 / 12,
        8.8 / 12,
        9.3 / 12,
        10.5 / 12,
        1,
    ])
    .interpolate(d3.interpolateHcl)
    .range([
        d3.rgb("#FE0000"),
        d3.rgb("#FF7300"),
        d3.rgb("#FFAA01"),
        d3.rgb("#FFD300"),
        d3.rgb("#FFFF01"),
        d3.rgb("#9FEE00"),
        d3.rgb("#01CC00"),
        d3.rgb("#009899"),
        d3.rgb("#1241AB"),
        d3.rgb("#3914B1"),
        d3.rgb("#7209AC"),
        d3.rgb("#CD0174"),
        d3.rgb("#FE0000"),
    ]);
export const colorWheel = d3
    .scaleLinear()
    .domain([
        0,
        1 / 12,
        2 / 12,
        3 / 12,
        4 / 12,
        5 / 12,
        6 / 12,
        7 / 12,
        8 / 12,
        9 / 12,
        10 / 12,
        11 / 12,
        1,
    ])
    .interpolate(d3.interpolateHcl)
    .range([
        d3.rgb("#da321f"),
        d3.rgb("#e06300"),
        d3.rgb("#e89b00"),
        d3.rgb("#ebcb03"),
        d3.rgb("#9fbb04"),
        d3.rgb("#2cbe03"),
        d3.rgb("#03b779"),
        d3.rgb("#06b3bd"),
        d3.rgb("#3875cc"),
        d3.rgb("#7503db"),
        d3.rgb("#c203ae"),
        d3.rgb("#e84b90"),
        d3.rgb("#da321f"),
    ]);

export function getNoteName(i) {
    return noteNames[i];
}

var DEGREES_PER_RADIAN = 180 / Math.PI;
var RADIANS_PER_DEGREE = Math.PI / 180;
const TWO_PI = 2 * Math.PI;
const OFFSET = Math.PI / 2; // (3 * Math.PI) / 2; // full cycle is 2pi

function sortWithIndeces(toSort) {
    const toSortValIndex = [];
    for (var i = 0; i < toSort.length; i++) {
        toSortValIndex.push([toSort[i], i]);
    }
    toSortValIndex.sort(function(left, right) {
        return left[0] < right[0] ? -1 : 1;
    });
    const toSortIndex = [];
    for (var j = 0; j < toSort.length; j++) {
        toSortIndex.push(toSortValIndex[j][1]);
    }
    return toSortIndex;
}

export function tonality(pitches) {
    let x = 0;
    let y = 0;
    let energy = 0;
    for (let i = 0; i < 12; i++) {
        const vangle = -(circleOfFifths[i] / 12.0) * TWO_PI + OFFSET;
        const vradius = pitches[i]; // Between 0 and 1
        energy += vradius / 12;
        x += vradius * Math.cos(vangle);
        y += vradius * Math.sin(vangle);
    }
    const angle = (1 - Math.atan2(x, y) / TWO_PI + 0.25) % 1;
    const radius = Math.sqrt(x * x + y * y) / (energy * 12);
    //return tonalityThirds(pitches);
    return [angle, radius, energy];
}

export function tonalityThirds(pitches) {
    let x = 0;
    let y = 0;
    let energy = 0;

    const sortedPitchIndexes = sortWithIndeces(pitches).reverse();
    for (let i = 0; i < pitches.length; i++) {
        const index = sortedPitchIndexes[i];
        if (index === -1) continue;
        sortedPitchIndexes[i] = -1;
        const vangle = -(circleOfFifths[index] / 12.0) * TWO_PI + OFFSET;
        const vradius = pitches[index]; // Between 0 and 1
        energy += vradius / 12;
        x += vradius * Math.cos(vangle);
        y += vradius * Math.sin(vangle);

        const majThirdIndex = (index + 4) % 12;
        if (sortedPitchIndexes.includes(majThirdIndex)) {
            const vangle = -(((12 + circleOfFifths[majThirdIndex] - 3.5) % 12) / 12.0) * TWO_PI + OFFSET;
            const vradius = pitches[majThirdIndex]; // Between 0 and 1
            energy += vradius / 12;
            x += vradius * Math.cos(vangle);
            y += vradius * Math.sin(vangle);
            sortedPitchIndexes[sortedPitchIndexes.indexOf(majThirdIndex)] = -1;
        }
    }
    const angle = (1 - Math.atan2(x, y) / TWO_PI + 0.25) % 1;
    const radius = Math.sqrt(x * x + y * y) / (energy * 12);
    return [angle, radius, energy];
}

export function tonalityThird(pitches) {
    let x = 0;
    let y = 0;
    let energy = 0;

    let maxIndex = -1;
    let max = -1;
    let secondMaxIndex = -1;
    let secondMax = -1;

    for (let i = 0; i < 12; i++) {
        if (pitches[i] > max) {
            max = pitches[i];
            maxIndex = i;
        }
        if (pitches[i] >= secondMax && i !== maxIndex) {
            secondMax = pitches[i];
            secondMaxIndex = i;
        }
    }
    // major third apart
    if ((12 + secondMaxIndex - maxIndex) % 12 !== 4) {
        secondMaxIndex = -1;
    }

    for (let i = 0; i < 12; i++) {
        let vangle = -(circleOfFifths[i] / 12.0) * TWO_PI + OFFSET;

        if (i === secondMaxIndex) {
            // add differently
            vangle = -(((12 + circleOfFifths[i] - 3.5) % 12) / 12.0) * TWO_PI + OFFSET;
        }

        const vradius = pitches[i]; // Between 0 and 1
        energy += vradius / 12;
        x += vradius * Math.cos(vangle);
        y += vradius * Math.sin(vangle);
    }
    const angle = (1 - Math.atan2(x, y) / TWO_PI + 0.25) % 1;
    const radius = Math.sqrt(x * x + y * y) / (energy * 12);
    return [angle, radius, energy];
}

export function tonalVectorColor(pitches) {
    const [angle, radius, energy] = tonality(pitches);

    //const color = d3.color(d3.interpolateSinebow((angle+OFFSET)%1.0));
    const color = d3.hsl(colorWheel(angle));
    const saturation = Math.min((radius * 3) / (energy * 12), 1); // 3 because chord usually minimally 3 tones
    color.s = saturation;
    return color.hex();
}

export function loudness(db) {
    const l = Math.max(0, 60 + db) / 60;
    return l * l;
}

export function logCompression(value, gamma = 1) {
    return Math.log(1 + gamma * value) / Math.log(gamma);
}
