<template>
    <g>
        <defs>
            <linearGradient :id="`glowRectGradient${section.start}${section.end}`" x1="0" x2="0" :y1="0" :y2="1">
                <stop offset="0" :style="`stop-color:${currentColor};stop-opacity:0`" />
                <stop offset="0.5" :style="`stop-color:${currentColor};stop-opacity:${glowOpacity}`" />
                <stop offset="1" :style="`stop-color:${currentColor};stop-opacity:0`" />
            </linearGradient>
            <linearGradient
                :id="`sectionGradient${section.start}`"
                x1="0"
                x2="0"
                :y1="max / (max - min)"
                :y2="-(1 - max) / (max - min)"
            >
                <stop
                    v-for="gradientStep in gradientSteps"
                    :key="gradientStep"
                    :offset="`${gradientStep}`"
                    :style="`stop-color:${colorGradient(gradientStep)};stop-opacity:1`"
                />
            </linearGradient>
        </defs>
        <rect
            class="glowRect"
            :fill="`url(#glowRectGradient${section.start}${section.end})`"
            :x="x"
            :y="currentY - (seekerIsInSection ? glowRectSize() / 2 : 0)"
            :width="width"
            :height="seekerIsInSection ? glowRectSize() : 0"
            :opacity="seekerIsInSection ? '1' : '0'"
        >
        </rect>
        <path
            class="shapedSection"
            :d="shapedSectionPath"
            shape-rendering="geometricPrecision"
            :fill="gradientColoring ? `url(#sectionGradient${section.start})` : color"
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
    ],
    components: {},
    data() {
        return {
            glowOpacity: 0.3,
            glowSize: 6,
            gradientColoring: true,
            gradientStepAmount: 16,
            strokeWidth: 0.5,
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
                    return vis.goldenRatioCategoricalColor(this.section.groupID, 1);
                case "circular":
                    return vis.sinebowColorNormalizedRadius(this.section.colorAngle, this.section.colorRadius, 1);
                case "linear":
                    return vis.zeroOneColorWarm(this.section.mdsFeature);
            }
        },
        seekerIsInSection() {
            return (
                this.$store.getters.seeker / 1000 >= this.section.start &&
                this.$store.getters.seeker / 1000 < this.section.end
            );
        },
        min() {
            return Math.min(...this.section.graph);
        },
        max() {
            return Math.max(...this.section.graph);
        },
        x() {
            return this.section.start * this.scale;
        },
        y() {
            return this.verticalOffset;
        },
        currentY() {
            return (1 - this.currentSample) * (this.containerHeight - this.height) + this.height / 2;
        },
        currentColor() {
            return this.colorGradient(this.currentSample);
        },
        sectionDuration() {
            return this.section.end - this.section.start;
        },
        currentSample() {
            if (!this.seekerIsInSection) return this.section.mdsFeature;
            const timeFactor = (this.$store.getters.seeker / 1000 - this.section.start) / this.sectionDuration;
            const sampleIndex = Math.floor(timeFactor * this.section.graph.length);
            return this.section.graph[sampleIndex];
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

            const points = [];

            points.push({
                x: this.section.start * this.scale,
                y: (1 - this.section.graph[1]) * (this.containerHeight - this.height) + halfHeight,
                w: 0,
            });
            this.section.graph.forEach((point, index) => {
                if (
                    (index > 0 && index < this.section.graph.length - 1 && (index + 1) % 3 !== 0) ||
                    (index > 0 && this.section.graph.length < 3)
                ) {
                    const factorOfWidth = index / this.section.graph.length;
                    const xTime = this.section.start + (this.section.end - this.section.start) * factorOfWidth;
                    const xPos = xTime * this.scale;

                    const y = (1 - point) * (this.containerHeight - this.height) + halfHeight;
                    const w =
                        (this.showLoudness
                            ? this.loudness(Math.round(xTime / this.track.features.sampleDuration))
                            : 1) *
                        this.height *
                        this.strokeWidth;
                    points.push({ x: xPos, y, w });
                }
            });

            points.push({
                x: this.section.end * this.scale,
                y:
                    (1 - this.section.graph[this.section.graph.length - 2]) * (this.containerHeight - this.height) +
                    halfHeight,
                w: 0,
            });

            const { d } = svgVariableWidthLine.compute(...svgVariableWidthLine.smooth(points, 2));

            return d;
        },
        gradientSteps() {
            let steps = [];
            for (let i = 0; i < this.gradientStepAmount; i++) {
                steps.push(i / this.gradientStepAmount);
            }
            return steps;
        },
    },
    watch: {},
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
            log.debug("clicked", this.section.mdsFeature);
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
        colorGradient(mdsFeature) {
            return vis.sinebowColorNormalizedRadius(mdsFeature, 1, 1);
        },
    },
};
</script>

<style scoped>
.shapedSection {
    z-index: 10;
    pointer-events: all;
    transition: 0.45s;
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
