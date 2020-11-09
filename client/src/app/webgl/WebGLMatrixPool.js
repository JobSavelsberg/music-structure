import WebGL from "./WebGL";
import assert from "assert";
import * as log from "../../dev/log";
import Matrix from "../dataStructures/Matrix";
import store from "../../store";

export default class WebGLMatrixPool extends WebGL {
    matrixBufferPool;

    constructor(...args) {
        super(...args);
    }

    fillMatrixBufferPool(track, selectedIndex) {
        assert(track.matrixes, "track does not have matrixes");
        this.matrixBufferPool = new Array(track.matrixes.length);
        track.matrixes.forEach((matrix, index) => {
            if (index === selectedIndex) {
                this.matrixBufferPool[index] = this.createDataArray(track, matrix.matrix);
            } else {
                setTimeout(() => (this.matrixBufferPool[index] = this.createDataArray(track, matrix.matrix)), 0);
            }
        });
    }

    select(index) {
        assert(this.matrixBufferPool);
        this.setBufferData(this.matrixBufferPool[index]);
    }

    draw(xCenterPositionNormalized, scaleX, scaleY) {
        super.draw((1 - xCenterPositionNormalized * 2) * scaleX, 0, scaleX, scaleY);
    }

    createDataArray(track, ssm) {
        const segmentStartDuration = track.getSegmentStartDuration();
        const size = segmentStartDuration.length;

        this.bufferSize = size * size * 6;
        if (this.bufferSize > 22e6) {
            log.error("Buffer OVERFLOW with size", this.bufferSize);
        }

        const halfDuration = track.getAnalysisDuration() / 2;
        function st(pos) {
            return pos / halfDuration - 1;
        } // Scale and translate

        const ssmVertices = [];
        const colors = [];
        const isMatrix = ssm instanceof Matrix;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let v;
                if (isMatrix) {
                    v = ssm.getValueNormalized(x, y);
                } else {
                    v = ssm.getValueNormalizedMirrored(x, y);
                }
                const left = st(segmentStartDuration[x][0]);
                const top = -st(segmentStartDuration[y][0]);
                const right = st(segmentStartDuration[x][0] + segmentStartDuration[x][1]);
                const bottom = -st(segmentStartDuration[y][0] + segmentStartDuration[y][1]);
                ssmVertices.push(left, top, left, bottom, right, top, right, top, left, bottom, right, bottom);
                colors.push(v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v);
            }
        }

        return { verts: new Float32Array(ssmVertices), colors: new Float32Array(colors) };
    }
}
