<template>
    <div class="py-1" v-if="hasStructure">
        <v-row>
            <v-col>Timbre Segmented Graph</v-col>
            <v-spacer></v-spacer>
            <v-btn icon small @click="showLoudness = !showLoudness" :color="showLoudness ? 'white' : 'dimgrey'">
                <v-icon>mdi-equalizer</v-icon>
            </v-btn>
        </v-row>
        <Seeker
            class="seeker"
            :ref="'timbreSegmentedGraphSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.3)'"
        />
        <svg class="timbreStructureSVG" :width="width" :height="height">
            <defs>
                <linearGradient id="pathGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop
                        v-for="gradientStep in gradientSteps"
                        :key="gradientStep"
                        :offset="`${gradientStep}`"
                        :style="`stop-color:${color(1 - gradientStep)};stop-opacity:1`"
                    />
                </linearGradient>
            </defs>
            <rect
                class="timbreSegmentedGraphBackground"
                id="timbreSegmentedGraphBackground"
                :width="width"
                :height="height"
                @click="click($event)"
            ></rect>
            <GraphSection
                v-for="(section, index) in segmentedTimbreGraph"
                :key="index + 'segmented'"
                :section="section"
                :height="sectionHeight"
                :scale="scale"
                :showLoudness="showLoudness"
                :coloring="'linear'"
                :positioning="'linear'"
                :verticalOffset="paddingTop"
                :containerHeight="height"
            />
        </svg>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import GraphSection from "./GraphSection";

import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
        GraphSection,
    },
    data() {
        return {
            paddingTop: 10,
            sectionHeight: 25,
            showLoudness: true,
            gradientStepAmount: 8,
        };
    },
    computed: {
        height() {
            return 150;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        hasStructure() {
            return this.track && this.track.segmentedTimbreGraph && this.track.segmentedTimbreGraph.length > 0;
        },
        segmentedTimbreGraph() {
            return this.track.segmentedTimbreGraph;
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
        color(mdsFeature) {
            return vis.sinebowColorNormalizedRadius(mdsFeature, 1, 1);
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

<style scoped>
.seeker {
    pointer-events: none;
}
.timbreSegmentedGraphBackground {
    opacity: 0;
}
</style>
