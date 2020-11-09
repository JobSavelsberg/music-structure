import * as log from "../../dev/log";
import * as d3 from "d3";
import store from "../../store";

export default class ZoomCanvas {
    drawLoop = null;
    canvas = null;
    ctx = null;
    trackDuration = 0;
    width = 0;
    zoomed = false;
    zoomScale = 1;
    drawFunction = null;

    constructor(canvas, type = "2d") {
        this.canvas = canvas;
        if (!canvas) {
            log.error("canvas not ready");
            return;
        }
        this.ctx = canvas.getContext(type);
        this.width = this.canvas.width;
        this.clear();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.canvas.height);
    }

    setTrackDuration(track) {
        this.trackDuration = track.getAnalysisDuration();
    }

    setZoomed(zoomed) {
        this.zoomed = zoomed;
        this.zoomScale = store.state.zoomScale;
        this.applyRenderMode();
    }

    setWidth(width) {
        this.width = width;
        this.applyRenderMode();
    }

    setDrawFunction(drawFunction) {
        this.drawFunction = drawFunction;
        this.applyRenderMode();
    }

    applyRenderMode() {
        clearInterval(this.drawLoop);
        if (this.zoomed) {
            this.drawLoop = setInterval(this.drawFunction, store.state.seekerUpdateSpeed);
        } else {
            this.drawFunction();
        }
    }

    getSeekerNormalized() {
        return store.state.seeker / (this.trackDuration * 1000);
    }

    getOffsetXNormalized() {
        return this.zoomed ? 0.5 - this.getSeekerNormalized() * this.zoomScale : 0;
    }

    drawRect(start, y, duration, height, color) {
        let startNormalized = start / this.trackDuration;
        if (this.zoomed) startNormalized *= this.zoomScale;

        const x = (startNormalized + this.getOffsetXNormalized()) * this.width;
        const width = (duration / this.trackDuration) * (this.zoomed ? this.zoomScale : 1) * this.width;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    drawVerticalLine(start, y, width, height, color) {
        let startNormalized = start / this.trackDuration;
        if (this.zoomed) startNormalized *= this.zoomScale;

        const x = (startNormalized + this.getOffsetXNormalized()) * this.width;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    drawText(start, y, text, color = "white", font = "12px") {
        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.fillText(text, start, y);
    }
}
