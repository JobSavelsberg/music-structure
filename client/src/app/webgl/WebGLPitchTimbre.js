import WebGL from "./WebGL";
import assert from "assert";
import * as log from "../../dev/log";
import Matrix from "../dataStructures/Matrix";
import * as vis from "../vis";
import * as d3 from "d3";

export default class WebGLPitchTimbre extends WebGL {
    pitchTimbreBufferPool;
    inverseBufferPoolLength = 0;
    bufferPoolLength = 0;

    marginPercentage = 0.8;

    constructor(canvas) {
        const useColor = true;
        super(canvas, useColor); // colored
    }

    fillpitchTimbreBufferPool(track, featureSelection) {
        assert(track.matrixes, "track does not have matrixes");
        this.pitchTimbreBufferPool = new Array(featureSelection.length);
        this.inverseBufferPoolLength = 1 / featureSelection.length;
        this.bufferPoolLength = featureSelection.length;

        featureSelection.forEach((featureObject, index) => {
            this.pitchTimbreBufferPool[index] = this.createSegmentFeatureDataArray(
                track,
                featureObject.data,
                featureObject.sampled,
                featureObject.range
            );
        });
    }

    inverseBufferPoolLength() {
        return 1 / this.pitchTimbreBufferPool;
    }

    draw(xCenterPositionNormalized, scaleX, scaleY) {
        for (let i = 0; i < this.bufferPoolLength; i++) {
            this.setBufferData(this.pitchTimbreBufferPool[i]);
            const scale = this.inverseBufferPoolLength * this.marginPercentage;
            super.draw(
                (1 - xCenterPositionNormalized * 2) * scaleX,
                1 - this.inverseBufferPoolLength - i * 2 * this.inverseBufferPoolLength,
                scaleX,
                scale
            );
        }
    }

    createSegmentFeatureDataArray(track, feature, sampled, range) {
        const startDuration = sampled ? track.features.sampleStartDuration : track.features.segmentStartDuration;
        const segmentAmount = startDuration.length;
        const vectorSize = feature[0].length;
        const inverseVectorSize = 1 / vectorSize;
        range = range || [0, 1];
        const centeredRange = range[0] === -range[1];

        this.bufferSize = segmentAmount * vectorSize * 6;
        if (this.bufferSize > 22e6) {
            log.error("Buffer OVERFLOW with size", this.bufferSize);
        }

        const halfDuration = track.getAnalysisDuration() / 2;
        function st(pos) {
            return pos / halfDuration - 1;
        } // Scale and translate

        const featureVertices = [];
        const colors = [];
        for (let s = 0; s < segmentAmount; s++) {
            for (let i = 0; i < vectorSize; i++) {
                const y = -1 + 2 * i * inverseVectorSize;
                const left = st(startDuration[s][0]);
                const top = y;
                const right = st(startDuration[s][0] + startDuration[s][1]);
                const bottom = y - 2 * inverseVectorSize;
                let value, color;
                if (centeredRange) {
                    value = feature[s][i];
                    color = d3.rgb(vis.divergingColor(value / range[1]));
                } else {
                    value = feature[s][i];
                    color = d3.rgb(vis.pitchColor(value));
                }
                const r = color.r / 255;
                const g = color.g / 255;
                const b = color.b / 255;
                featureVertices.push(left, top, left, bottom, right, top, right, top, left, bottom, right, bottom);
                colors.push(r, g, b, r, g, b, r, g, b, r, g, b, r, g, b, r, g, b);
            }
        }

        return { verts: new Float32Array(featureVertices), colors: new Float32Array(colors) };
    }
}
