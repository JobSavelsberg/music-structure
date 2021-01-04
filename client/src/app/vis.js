import * as log from "../dev/log";
import * as d3 from "d3";
import * as audioUtil from "./audioUtil";

import * as Track from "./Track";

export const zeroOneColor = d3
    .scaleSequential()
    .domain([0, 1])
    .interpolator(d3.interpolateViridis);
export const pitchColor = zeroOneColor;
export const greyScaleColor = d3
    .scaleSequential()
    .domain([1, 0])
    .interpolator(d3.interpolateGreys);
export const rainbowColor = d3
    .scaleSequential()
    .domain([0, 11])
    .interpolator(d3.interpolateRainbow);
export const sinebowColorNormalized = d3
    .scaleSequential()
    .domain([0, 1])
    .interpolator(d3.interpolateSinebow);
export const rawTimbreColor = d3
    .scaleDiverging()
    .domain([-300, 0, 300])
    .interpolator(d3.interpolateRdBu);
export const divergingColor = d3
    .scaleDiverging()
    .domain([-1, 0, 1])
    .interpolator(d3.interpolateRdBu);
export const categoryColor = d3.scaleOrdinal().range(d3.schemeCategory10);
export function categoryColorWithOpacity(color, opacity){
    const c = d3.rgb(categoryColor(color));
    return `rgba(${c.r},${c.g},${c.b},${opacity})`;
}
export function lightness(color, lightness) {
    const hslColor = d3.hsl(color);
    hslColor.l = lightness;
    return hslColor.hex();
}

export function sinebowColorNormalizedRadius(angle, radius){
    const color = sinebowColorNormalized(angle);
    const colorHSL = d3.hsl(color);
    colorHSL.s = Math.pow(radius,0.2);
    return colorHSL.formatHex();
}

export function renderRawPitch(track, left, width, yOffset, height, ctx) {
    const scale = width / track.getAnalysis().track.duration;
    track.getSegments().forEach((segment) => {
        for (let i = 0; i < 12; i++) {
            const x = left + segment.start * scale;
            const segmentHeight = height / 12 - 2;
            const y = yOffset + (11 - i) * (segmentHeight + 2);
            const segmentWidth = segment.duration * scale;
            ctx.fillStyle = pitchColor(segment.segment.pitches[i]);
            ctx.fillRect(x, y, segmentWidth, segmentHeight);
        }
    });
}

export function renderPercussionPitch(track, left, width, yOffset, height, ctx) {
    const scale = width / track.getAnalysis().track.duration;
    track.getSegments().forEach((segment, segmentIndex) => {
        const x = left + segment.start * scale;
        const segmentHeight = height / 3 - 2;
        let y = yOffset + 0 * (segmentHeight + 2);
        const segmentWidth = segment.duration * scale;
        ctx.fillStyle = pitchColor(segment.tonalityEnergy * 2 - 0.5);
        ctx.fillRect(x, y, segmentWidth, segmentHeight);
        y = yOffset + 1 * (segmentHeight + 2);
        ctx.fillStyle = pitchColor(1 - segment.tonalityRadius);
        ctx.fillRect(x, y, segmentWidth, segmentHeight);
        y = yOffset + 2 * (segmentHeight + 2);
        ctx.fillStyle = segment.duration > 0.15 ? pitchColor(0) : pitchColor(segment.percussiony);
        ctx.fillRect(x, y, segmentWidth, segmentHeight);
    });
}

export function renderProcessedPitch(track, left, width, yOffset, height, ctx) {
    const scale = width / track.getAnalysis().track.duration;
    track.getSegments().forEach((segment) => {
        for (let i = 0; i < 12; i++) {
            const x = left + segment.start * scale;
            const segmentHeight = height / 12 - 2;
            const y = yOffset + (11 - i) * (segmentHeight + 2);
            const segmentWidth = segment.duration * scale;
            ctx.fillStyle = pitchColor(segment.pitches[i]);
            ctx.fillRect(x, y, segmentWidth, segmentHeight);
        }
    });
}
export function renderRawTimbre(track, left, width, yOffset, height, ctx) {
    const scale = width / track.getAnalysis().track.duration;
    track.getSegments().forEach((segment, segmentIndex) => {
        for (let i = 0; i < 12; i++) {
            const x = left + segment.start * scale;
            const segmentHeight = height / 12 - 2;
            const y = yOffset + (11 - i) * (segmentHeight + 2);
            const segmentWidth = segment.duration * scale;
            ctx.fillStyle = divergingColor(track.getProcessedTimbre(segmentIndex)[i]);
            ctx.fillRect(x, y, segmentWidth, segmentHeight);
        }
    });
}

export function renderRawRhythm(track, left, width, yOffset, height, ctx) {
    const scale = width / track.getAnalysis().track.duration;
    track.getBars().forEach((bar) => {
        const x = left + bar.start * scale;
        const y = yOffset;
        ctx.fillStyle = greyScaleColor(0.3 + bar.confidence);
        ctx.fillRect(x, y, 1, height / 3);
    });
    track.getBeats().forEach((beat) => {
        const x = left + beat.start * scale;
        const y = yOffset + height / 3;
        ctx.fillStyle = greyScaleColor(0.3 + beat.confidence);
        ctx.fillRect(x, y, 1, height / 3);
    });
    track.getTatums().forEach((tatum) => {
        const x = left + tatum.start * scale;
        const y = yOffset + (height / 3) * 2;
        ctx.fillStyle = greyScaleColor(0.3 + tatum.confidence);
        ctx.fillRect(x, y, 1, height / 3);
    });
}

export function renderTonality(track, left, width, yOffset, height, ctx) {
    const scale = width / track.getAnalysis().track.duration;
    track.getSegments().forEach((segment) => {
        const x = left + segment.start * scale;
        const segmentHeight = height;
        const y = yOffset;
        const segmentWidth = segment.duration * scale;
        ctx.fillStyle = audioUtil.tonalVectorColor(segment.pitches);
        ctx.fillRect(x, y, segmentWidth, segmentHeight);
    });
}

export function renderSSM(track, left, width, yOffset, height, ctx) {
    console.log("Rendering ssm...");
    const scale = height / track.getAnalysis().track.duration;
    const size = track.getSegments().length;
    for (let i = 0; i < size; i++) {
        for (let j = i; j < size; j++) {
            const segmentA = track.getSegment(i);
            const segmentB = track.getSegment(j);

            const pitch = track.getSSM()[i][j - i][0];

            ctx.fillStyle = greyScaleColor(Math.pow(pitch, 4));

            const x = left + segmentA.start * scale;
            const segmentWidth = segmentA.duration * scale;

            const y = yOffset + segmentB.start * scale;
            const segmentHeight = segmentB.duration * scale;
            if (!segmentHeight) {
                return;
            }
            ctx.fillRect(x, y, segmentWidth, segmentHeight);

            const timbre = track.getSSM()[i][j - i][1];

            ctx.fillStyle = greyScaleColor(Math.pow(timbre, 5));
            ctx.fillRect(y + left - yOffset, x - left + yOffset, segmentHeight, segmentWidth);
        }
    }
}

export function renderWaveform(ctx, width, height, track, options = {}) {
    const segments = track.features.segments;
    const scale = width / track.features.duration;
    ctx.fillStyle = "white";
    if (options.detailed) {
        ctx.beginPath();
        ctx.moveTo(0, height);
        segments.forEach((segment) => {
            const startTime = segment.start * scale;
            const startVolume = audioUtil.loudness(segment.loudness_start) * height;
            const maxTime = (segment.start + segment.loudness_max_time) * scale;
            const maxVolume = audioUtil.loudness(segment.loudness_max) * height;

            ctx.lineTo(startTime, height - startVolume);
            ctx.lineTo(maxTime, height - maxVolume);
        });
        ctx.lineTo(width, height);

        ctx.closePath();
        ctx.fill();
    } else {
        segments.forEach((segment) => {
            ctx.fillRect(
                segment.start * scale,
                height,
                segment.duration * scale,
                -audioUtil.loudness(segment.loudness_max) * height
            );
        });
    }
}

export function drawAnchorPoints(track, ctx, canvasWidth) {
    const ancholor = track.scapePlotAnchorColor;
    const anchorAmount = ancholor.length / 5;
    const halfWidth = canvasWidth / 2;
    const scale = halfWidth * 0.95;
    const size = 6;
    const scaleFromTopLeft = 0.35;
    for (let i = 0; i < anchorAmount; i++) {
        const anchorX = ancholor[i * 5 + 2];
        const anchorY = ancholor[i * 5 + 3];
        const anchorAngle = ancholor[i * 5 + 4];

        const color = d3.hsl(d3.interpolateSinebow(anchorAngle));
        color.l = 0.6;
        ctx.fillStyle = color.hex();

        const x = halfWidth + anchorX * scale;
        const y = halfWidth + anchorY * scale;
        ctx.fillRect(
            (x - size / 2) * scaleFromTopLeft,
            (y - size / 2) * scaleFromTopLeft,
            size * scaleFromTopLeft,
            size * scaleFromTopLeft
        );
    }
}

export function drawScapePlot(track, ctx, canvasWidth, color=true) {
    ctx.clearRect(0, 0, canvasWidth, canvasWidth);
    // eslint-disable-next-line no-unreachable
    const scapePlot = track.scapePlot;
    const scapePlotAnchorColor = track.scapePlotAnchorColor;
    const minSize = Track.SPminSize;
    const stepSize = Track.SPstepSize;
    const sampleAmount = track.features.sampleAmount;
    const scale = canvasWidth / sampleAmount;

    //const size = Math.ceil((sampleAmount - minSize) / stepSize);
    const sqrt2 = Math.sqrt(2);

    scapePlot.forEachCell((x, y, value) => {
        //ctx.fillStyle = greyScaleColor(value);
        if(color){
            ctx.fillStyle = anchorColorLerp(x, y, scapePlotAnchorColor, value);
        }else{
            ctx.fillStyle = zeroOneColor(value)

            if(value > 0.95){
                ctx.fillStyle = 'red';
            }
        }

        const start = x * stepSize;
        const size = (scapePlot.size - 1 - y) * stepSize;

        const rectX = start + size / 2;
        const rectY = sampleAmount - size - minSize;
        const width = stepSize;
        const height = stepSize;
        ctx.fillRect(rectX * scale, rectY * scale, width * scale * 1.1, height * scale * 1.1);
    });
    drawAnchorPoints(track, ctx, canvasWidth);
}

function anchorColorLerp(cellX, cellY, ancholor, value) {
    const anchorAmount = ancholor.length / 5;

    let aDist = Infinity;
    let aAngle;
    let bDist = Infinity;
    let bAngle;
    for (let i = 0; i < anchorAmount; i++) {
        const anchorX = ancholor[i * 5];
        const anchorY = ancholor[i * 5 + 1];
        const anchorAngle = ancholor[i * 5 + 4];
        const dist = Math.pow(anchorX - cellX, 2) + Math.pow(anchorY - cellY, 2);
        if (dist < aDist || dist < bDist) {
            if (aDist > bDist) {
                aDist = dist;
                aAngle = anchorAngle;
            } else {
                bDist = dist;
                bAngle = anchorAngle;
            }
        }
    }
    const closenessToB = aDist / (aDist + bDist);
    const angle = angleLerp(aAngle, bAngle, closenessToB);
    //const color = d3.hsl(audioUtil.colorWheel(angle));
    const color = d3.hsl(d3.interpolateSinebow(angle));
    color.l = value * 0.9; // values that are 1 need to be a little darker for the color to
    color.s = 0.3 + value / 2;
    //const fitnessColor = d3.hsl(zeroOneColor(Math.pow(value, 1.5)));
    //fitnessColor.l = value < 0.5 ? fitnessColor.l * (value / 0.5) : fitnessColor.l;
    return color.hex();
}

function angleLerp(angleA, angleB, val) {
    if (angleB > angleA) {
        const distClock = angleB - angleA;
        const distAntiClock = angleA + (1 - angleB);
        if (distClock < distAntiClock) {
            return (angleA + distClock * val) % 1;
        } else {
            return (angleB + distAntiClock * (1 - val)) % 1;
        }
    } else if (angleA > angleB) {
        const distClock = angleA - angleB;
        const distAntiClock = angleB + (1 - angleA);
        if (distClock < distAntiClock) {
            return (angleB + distClock * (1 - val)) % 1;
        } else {
            return (angleA + distAntiClock * val) % 1;
        }
    } else {
        return angleA;
    }
}

export function createCanvasContext(canvas, type = "2d") {
    if (!canvas) {
        log.error("canvas not ready");
        return;
    }
    const ctx = canvas.getContext(type);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return ctx;
}
