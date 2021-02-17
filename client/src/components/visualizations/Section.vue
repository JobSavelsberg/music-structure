<template>
    <g>
        <defs>
            <linearGradient :id="`glowRectGradient${section.start}${section.end}`" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" :style="`stop-color:${color};stop-opacity:0`" />
                <stop offset="0.5" :style="`stop-color:${color};stop-opacity:${glowOpacity}`" />
                <stop offset="1" :style="`stop-color:${color};stop-opacity:0`" />
            </linearGradient>
        </defs>
        <rect
            class="glowRect"
            :fill="`url(#glowRectGradient${section.start}${section.end})`"
            :x="x"
            :y="y + height / 2 - (seekerIsInSection ? glowRectSize() / 2 : 0)"
            :width="width"
            :height="seekerIsInSection ? glowRectSize() : 0"
            :opacity="seekerIsInSection ? '1' : '0'"
        >
        </rect>
        <path
            class="shapedSection"
            :d="shapedSectionPath"
            :fill="color"
            @mouseover="hover($event)"
            @mouseout="unhover()"
            @click="click($event)"
        ></path>
    </g>
</template>

<script>
import * as vis from "../../app/vis";
import * as log from "../../dev/log";
import * as player from "../../app/player";
import { sampleDuration } from "../../app/Track";
import * as audioUtil from "../../app/audioUtil";
import * as svgVariableWidthLine from "svg-variable-width-line";
import * as d3 from "d3";

export default {
    props: [
        "section",
        "height",
        "scale",
        "verticalOffset",
        "containerHeight",
        "showLoudness",
        "coloring",
        "positioning",
        "loop",
    ],
    components: {},
    data() {
        return {
            glowOpacity: 0.4,
            glowSize: 6,
            seekerWasInSection: false,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },

        verticalPosition() {
            switch (this.positioning) {
                default:
                case "cluster" || "group":
                    return this.section.groupID * this.height + this.verticalOffset;
                case "circular":
                    return this.section.colorAngle * (this.containerHeight - this.height);
                case "linear":
                    return this.section.mdsFeature * (this.containerHeight - this.height);
            }
        },
        color() {
            switch (this.coloring) {
                default:
                case "cluster" || "group":
                    return vis.goldenRatioCategoricalColor(this.section.groupID, 0);
                case "circular":
                    return vis.sinebowColorNormalizedRadius(this.section.colorAngle, 1, 1);
                case "linear":
                    return vis.zeroOneColorWarm(this.section.mdsFeature);
            }
        },
        seekerIsInSection() {
            const isSeekerInSection =
                this.$store.getters.seeker / 1000 >= this.section.start &&
                this.$store.getters.seeker / 1000 < this.section.end;
            return isSeekerInSection;
        },

        x() {
            return this.section.start * this.scale;
        },
        y() {
            return this.verticalOffset + this.verticalPosition;
        },
        width() {
            return Math.max(1, (this.section.end - this.section.start) * this.scale - 2);
        },
        smoothedAvgLoudness() {
            return this.track && this.track.features.sampled.smoothedAvgLoudness;
        },
        directLoudness() {
            return this.track && this.track.features.directLoudness;
        },
        shapedSectionPath() {
            const halfHeight = this.height / 2;
            let roundoff = 4;
            let step = 4 / this.width;
            step = Math.max(0.001, step);

            const yMid = (time) => {
                if (this.section.graph === undefined) return this.y + halfHeight;
                const factorOfWidth = (time - this.section.start) / (this.section.end - this.section.start);
                const sampleInSection = Math.min(
                    Math.floor(factorOfWidth * this.section.graph.length),
                    this.section.graph.length - 1
                );
                const mdsValue = this.section.graph[sampleInSection];
                return mdsValue * (this.containerHeight - this.height) + halfHeight;
            };

            const tooSmall = this.width <= roundoff * 2;
            if (tooSmall) {
                roundoff = this.width / 2;
            }

            const firstSample = Math.round((this.x + roundoff) / this.scale / this.track.features.sampleDuration);
            const firstLoudness = this.showLoudness ? this.loudness(firstSample) : 1;
            const firstYMid = yMid(this.section.start);

            let lastSample = Math.floor(
                (this.x + this.width - roundoff) / this.scale / this.track.features.sampleDuration
            );

            const lastLoudness = this.showLoudness ? this.loudness(lastSample) : 1;
            const lastYMid = yMid(this.section.end);

            let path = `M ${this.x} ${Math.round(firstYMid)} L ${this.x} ${firstYMid -
                Math.max(0, halfHeight * firstLoudness - roundoff)} Q ${this.x} ${firstYMid -
                halfHeight * firstLoudness}, ${this.x + roundoff} ${firstYMid - halfHeight * firstLoudness}`;

            const startFraction = roundoff / this.width;
            const endFraction = 1 - roundoff / this.width;

            // Top
            for (let i = startFraction + step; i < endFraction - step; i += step) {
                const pointX = this.x + i * this.width;
                const sample = Math.round(pointX / this.scale / this.track.features.sampleDuration);
                const loudness = this.showLoudness ? this.loudness(sample) : 1;
                const pointY = yMid(pointX / this.scale) - halfHeight * loudness;
                path = path.concat(" L ", pointX, " ", pointY);
            }

            // Turnaround on the right
            path = path.concat(" L ", this.x + this.width - roundoff, " ", lastYMid - halfHeight * lastLoudness);
            path = path.concat(
                ` Q ${this.x + this.width} ${lastYMid - halfHeight * lastLoudness}, ${this.x + this.width} ${lastYMid -
                    Math.max(0, halfHeight * lastLoudness - roundoff)} L ${this.x + this.width} ${lastYMid +
                    Math.max(0, halfHeight * lastLoudness - roundoff)} Q ${this.x + this.width} ${lastYMid +
                    halfHeight * lastLoudness}, ${this.x + this.width - roundoff} ${lastYMid +
                    halfHeight * lastLoudness}`
            );

            // Bottom
            for (let i = endFraction - step; i > startFraction + step; i -= step) {
                const pointX = this.x + i * this.width;
                const sample = Math.round(pointX / this.scale / this.track.features.sampleDuration);
                const loudness = this.showLoudness ? this.loudness(sample) : 1;
                const pointY = yMid(pointX / this.scale) + halfHeight * loudness;
                path = path.concat(" L ", pointX, " ", pointY);
            }

            // close of path with last sample
            path = path.concat(
                ` L ${this.x + roundoff} ${firstYMid + halfHeight * firstLoudness} Q ${this.x} ${firstYMid +
                    halfHeight * firstLoudness}, ${this.x} ${firstYMid +
                    Math.max(0, halfHeight * firstLoudness - roundoff)} Z `
            );

            return path;
        },
    },
    watch: {
        seekerIsInSection() {
            if (
                this.loop &&
                !this.seekerIsInSection &&
                this.$store.getters.seeker / 1000 >= this.section.end &&
                this.$store.getters.seeker / 1000 < this.section.end + 0.1
            ) {
                const offset = 0;
                const timeExtra = this.$store.getters.seeker / 1000 - this.section.end;
                setTimeout(() => {
                    player.seekS(this.section.start + timeExtra);
                }, offset * 1000);
            }
        },
    },
    mounted() {},
    methods: {
        loudness(sample) {
            return this.smoothedAvgLoudness[sample] / this.track.features.maxLoudness || 0;
        },
        loudnessTime(time) {
            const sample = Math.floor(time / this.track.features.sampleDuration);
            return this.smoothedAvgLoudness[sample] / this.track.features.maxLoudness || 0;
        },
        directLoudnessTime(time) {
            const sample = Math.floor(time / this.track.features.directLoudnessSampleDuration);
            return this.directLoudness[sample] / this.track.features.maxLoudness || 0;
        },
        hover(event) {},
        unhover() {},
        click(event) {
            log.debug("clicked", audioUtil.keyNames[this.section.key]);
            if (event.shiftKey) {
                const startInSamples = this.section.start / this.track.features.sampleDuration;
                const endInSamples = this.section.end / this.track.features.sampleDuration;
                this.track.updateDTW(startInSamples, endInSamples);
            } else {
                player.seekS(this.section.start);
            }
        },
        glowRectSize() {
            return (
                this.glowSize *
                this.height *
                (0.15 +
                    this.directLoudnessTime(this.$store.getters.seeker / 1000) / 4 +
                    Math.pow(this.loudnessTime(this.$store.getters.seeker / 1000), 1.5))
            );
        },
    },
};
</script>

<style scoped>
.shapedSection {
    z-index: 10;
    pointer-events: all;
    transition: 0.25s;
    stroke-linejoin: round;
}
.glowRect {
    z-index: -1;
    pointer-events: none;
    transition-timing-function: linear;
    transition: 0.5s;
}
.shapedSection:hover {
    fill: white !important;
    cursor: pointer;
}
</style>
