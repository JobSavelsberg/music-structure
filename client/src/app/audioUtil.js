import * as log from "../dev/log";

const d3 = require("d3");
export const circleOfFifths = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // Starting from C=0
export const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const keyNames = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "F#",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
    "Cm",
    "Dbm",
    "Dm",
    "Ebm",
    "Em",
    "Fm",
    "F#m",
    "Gm",
    "Abm",
    "Am",
    "Bbm",
    "Bm",
];

//https://www.vectorstock.com/royalty-free-vector/color-wheel-spectrum-scheme-selection-color-vector-25483441
export const colorWheel = d3
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

export function getNoteName(i) {
    return noteNames[i];
}

var DEGREES_PER_RADIAN = 180 / Math.PI;
var RADIANS_PER_DEGREE = Math.PI / 180;
var TWO_PI = 2 * Math.PI;
var OFFSET = (3 * Math.PI) / 2; // full cycle is 2pi

export function tonality(pitches) {
    let x = 0;
    let y = 0;
    let energy = 0;
    for (let i = 0; i < 12; i++) {
        const angle = (-circleOfFifths[i] / 12.0) * TWO_PI + OFFSET;
        const radius = pitches[i]; // Between 0 and 1
        energy += radius / 12;
        x += radius * Math.cos(angle);
        y += radius * Math.sin(angle);
    }

    const angle = (Math.atan2(x, y) + Math.PI) / TWO_PI;
    const radius = Math.sqrt(x * x + y * y);
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
