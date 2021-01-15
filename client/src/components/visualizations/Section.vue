<template>
    <path
        class="shapedSection"
        :d="shapedSectionPath"
        :fill="color"
        @mouseover="hover($event)"
        @mouseout="unhover()"
        @click="click($event)"
    ></path>
</template>

<script>
import * as vis from "../../app/vis";
import * as log from "../../dev/log";
import * as player from "../../app/player";

export default {
    props: ["section", "height", "scale", "verticalOffset", "showLoudness", "coloring"],
    components: {},
    data() {
        return {};
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        verticalPosition() {
            return this.section.groupID * this.height;
        },
        color() {
            switch (this.coloring) {
                default:
                case "cluster" || "group":
                    return vis.categoryColorWithOpacity(this.section.groupID, 1);
                case "circular":
                    return vis.sinebowColorNormalizedRadius(this.section.colorAngle, this.section.colorRadius, 1);
                case "linear":
                    return vis.zeroOneColorWarm(this.section.mdsFeature);
            }
        },
        x() {
            return this.section.start * this.scale;
        },
        y() {
            return this.verticalOffset + this.verticalPosition;
        },
        width() {
            return (this.section.end - this.section.start) * this.scale - 2;
        },
        averageLoudness() {
            return this.track && this.track.features.sampled.smoothedAvgLoudness;
        },
        shapedSectionPath() {
            const halfHeight = this.height / 2;
            let roundoff = 4;
            const step = 4 / this.width;
            const yMid = this.y + halfHeight;

            const tooSmall = this.width <= roundoff * 2;
            if (tooSmall) {
                roundoff = this.width / 2;
            }

            const firstSample = Math.round((this.x + roundoff) / this.scale / this.track.features.sampleDuration);
            const firstLoudness = this.showLoudness ? this.loudness(firstSample) : 1;

            let lastSample = Math.floor(
                (this.x + this.width - roundoff) / this.scale / this.track.features.sampleDuration
            );

            const lastLoudness = this.showLoudness ? this.loudness(lastSample) : 1;

            let path = `M ${this.x} ${Math.round(yMid)} L ${this.x} ${yMid -
                Math.max(0, halfHeight * firstLoudness - roundoff)} Q ${this.x} ${yMid -
                halfHeight * firstLoudness}, ${this.x + roundoff} ${yMid - halfHeight * firstLoudness}`;

            const startFraction = roundoff / this.width;
            const endFraction = 1 - roundoff / this.width;

            // Top
            for (let i = startFraction + step; i < endFraction - step; i += step) {
                const pointX = this.x + i * this.width;
                const sample = Math.round(pointX / this.scale / this.track.features.sampleDuration);
                const loudness = this.showLoudness ? this.loudness(sample) : 1;
                const pointY = yMid - halfHeight * loudness;
                path = path.concat(" L ", pointX, " ", pointY);
            }

            // Turnaround on the right
            path = path.concat(" L ", this.x + this.width - roundoff, " ", yMid - halfHeight * lastLoudness);
            path = path.concat(
                ` Q ${this.x + this.width} ${yMid - halfHeight * lastLoudness}, ${this.x + this.width} ${yMid -
                    Math.max(0, halfHeight * lastLoudness - roundoff)} L ${this.x + this.width} ${yMid +
                    Math.max(0, halfHeight * lastLoudness - roundoff)} Q ${this.x + this.width} ${yMid +
                    halfHeight * lastLoudness}, ${this.x + this.width - roundoff} ${yMid + halfHeight * lastLoudness}`
            );

            // Bottom
            for (let i = endFraction - step; i > startFraction + step; i -= step) {
                const pointX = this.x + i * this.width;
                const sample = Math.round(pointX / this.scale / this.track.features.sampleDuration);
                const loudness = this.showLoudness ? this.loudness(sample) : 1;
                const pointY = yMid + halfHeight * loudness;
                path = path.concat(" L ", pointX, " ", pointY);
            }

            // close of path with last sample
            path = path.concat(
                ` L ${this.x + roundoff} ${yMid + halfHeight * firstLoudness} Q ${this.x} ${yMid +
                    halfHeight * firstLoudness}, ${this.x} ${yMid +
                    Math.max(0, halfHeight * firstLoudness - roundoff)} Z `
            );

            return path;
        },
    },
    watch: {},
    mounted() {},
    methods: {
        loudness(sample) {
            return this.averageLoudness[sample] / this.track.features.maxLoudness;
        },
        hover(event) {},
        unhover() {},
        click(event) {
            if (event.shiftKey) {
                const startInSamples = this.section.start / this.track.features.sampleDuration;
                const endInSamples = this.section.end / this.track.features.sampleDuration;
                this.track.updateDTW(startInSamples, endInSamples);
            } else {
                player.seekS(this.section.start);
            }
        },
    },
};
</script>

<style scoped>
.shapedSection {
    pointer-events: all;
    transition: 0.25s;
    stroke-linejoin: round;
}
.shapedSection:hover {
    fill: white !important;
    cursor: pointer;
}
</style>
