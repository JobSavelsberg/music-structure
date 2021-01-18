<template>
    <g>
        <g v-for="(section, index) in structure" :key="section.start">
            <defs>
                <linearGradient :id="`timbreBackgroundGradient${index}`" x1="0" x2="0" y1="0" y2="1">
                    <stop :offset="`${0}`" :style="`stop-color:${backgroundColor(section)};stop-opacity:0`" />
                    <stop
                        :offset="`${section.colorAngle}`"
                        :style="`stop-color:${backgroundColor(section)};stop-opacity:1`"
                    />
                    <stop :offset="`${1}`" :style="`stop-color:${backgroundColor(section)};stop-opacity:0`" />
                </linearGradient>
            </defs>
            <rect
                class="background"
                :key="section.start + 'bg'"
                :x="section.start * scale"
                :y="0"
                :width="(section.end - section.start) * scale"
                :height="height"
                :fill="`url(#timbreBackgroundGradient${index})`"
                @click="click($event)"
            >
            </rect>
            <rect
                class="separator"
                :x="section.start * scale - 1.5"
                :y="0"
                :width="3"
                :height="height"
                :fill="separatorColor(section)"
            ></rect>
        </g>
    </g>
</template>

<script>
import * as vis from "../../app/vis";
import * as player from "../../app/player";

export default {
    props: ["width", "height", "scale", "structure"],
    components: {},
    data() {
        return {
            showSeparators: true,
            showBackground: true,
            backgroundOpacity: 0.07,
            separtorOpacity: 0.15,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
    },
    watch: {},
    mounted() {},
    methods: {
        backgroundColor(section) {
            return vis.sinebowColorNormalizedRadius(
                section.colorAngle,
                1,
                this.backgroundOpacity * this.showBackground
            );
        },
        separatorColor(section) {
            return vis.sinebowColorNormalizedRadius(section.colorAngle, 1, this.separtorOpacity * this.showSeparators);
        },
        click(event) {
            let xNormalized = 0;
            let yNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
                yNormalized = event.layerY / this.height;
            } else {
                xNormalized = event.offsetX / this.width;
                yNormalized = event.layerY / this.height;
            }

            if (this.useZoom && this.isZoomed) {
                const xFromMiddle = xNormalized * 2 - 1;
                const seekerPos = Math.min(
                    1,
                    Math.max(
                        0,
                        this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000) +
                            xFromMiddle / (2 * this.zoomScale)
                    )
                );
                player.seekS(seekerPos * this.track.getAnalysisDuration());
            } else {
                player.seekS(xNormalized * this.track.getAnalysisDuration());
            }
        },
    },
};
</script>

<style scoped></style>
