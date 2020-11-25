import * as log from "../../dev/log";
import * as d3 from "d3";
import store from "../../store";

export default class ZoomCanvas {
    drawLoop = null;
    canvas = null;
    ctx = null;
    trackDuration = 0;
    width = 0;
    height = 0;
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
        this.height = this.canvas.height;
        this.clear();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
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
        this.canvas.width = width;
        setTimeout(() => this.applyRenderMode(), 0);
    }

    setHeight(height) {
        this.height = height;
        this.canvas.height = height;
        setTimeout(() => this.applyRenderMode(), 0);
    }

    setDrawFunction(drawFunction) {
        this.drawFunction = drawFunction;
        this.applyRenderMode();
    }

    applyRenderMode() {
        clearInterval(this.drawLoop);
        if (this.zoomed) {
            this.drawLoop = setInterval(() => this.clearAndDraw(), store.state.seekerUpdateSpeed);
        } else {
            this.clearAndDraw();
        }
    }

    clearAndDraw() {
        this.clear();
        this.drawFunction();
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

    drawRectWithBorder(start, y, duration, height, color, borderSize, borderColor) {
        let startNormalized = start / this.trackDuration;
        if (this.zoomed) startNormalized *= this.zoomScale;

        const x = (startNormalized + this.getOffsetXNormalized()) * this.width;
        const width = (duration / this.trackDuration) * (this.zoomed ? this.zoomScale : 1) * this.width;
        if (borderColor !== null) {
            this.ctx.fillStyle = borderColor;
            this.ctx.fillRect(x, y, width, height);
        }
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x + borderSize, y + borderSize, width - borderSize * 2, height - borderSize * 2);
    }

    drawVerticalLine(start, y, width, height, color) {
        let startNormalized = start / this.trackDuration;
        if (this.zoomed) startNormalized *= this.zoomScale;

        const x = (startNormalized + this.getOffsetXNormalized()) * this.width;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    drawText(start, y, text, color = "white", font = "12px Roboto") {
        let startNormalized = start / this.trackDuration;
        if (this.zoomed) startNormalized *= this.zoomScale;

        const x = (startNormalized + this.getOffsetXNormalized()) * this.width;

        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.fillText(text, x, y);
    }

    drawTitle(y, text, color = "white", font = "16px Roboto") {
        const x = 0;

        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.fillText(text, x, y);
    }
}
