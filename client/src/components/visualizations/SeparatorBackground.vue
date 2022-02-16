<template>
    <g>
        <g v-for="(separator, index) in separators" :key="separator.start">
            <defs>
                <linearGradient :id="`backgroundGradient${index}`" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" :style="`stop-color:${backgroundColor(separator)};stop-opacity:1`" />
                    <stop offset="100%" :style="`stop-color:${backgroundColor(separator)};stop-opacity:1`" />
                </linearGradient>
            </defs>
            <rect
                v-if="showBackground"
                class="background"
                :key="separator.start + 'bg'"
                :x="separator.start * scale - 1"
                :y="0"
                :width="(separator.end - separator.start) * scale"
                :height="height"
                :fill="`url(#backgroundGradient${index})`"
                @click="click($event)"
            >
            </rect>
            <rect
                v-if="showSeparators"
                class="separator"
                :x="separator.start * scale - 1"
                :y="0"
                :width="3"
                :height="height"
                :fill="separatorColor(separator)"
            ></rect>
        </g>
    </g>
</template>

<script>
import * as vis from "../../app/vis";
import * as player from "../../app/player";

export default {
    props: ["width", "height", "scale"],
    components: {},
    data() {
        return {
            showSeparators: false,
            showBackground: false,
            backgroundOpacity: 0.2,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        separators() {
            return this.track.separatorGenerator();
        },
    },
    watch: {},
    mounted() {},
    methods: {
        backgroundColor(separator) {
            return vis.goldenRatioCategoricalColor(separator.groupID, 0, 0.2);
        },
        separatorColor(separator) {
            return vis.goldenRatioCategoricalColor(separator.groupID, 0, 0.5);
        },
        click(event) {
            console.log("clicked", event);
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
            this.$store.commit("setInputFocus", false);
        },
    },
};
</script>

<style scoped></style>
