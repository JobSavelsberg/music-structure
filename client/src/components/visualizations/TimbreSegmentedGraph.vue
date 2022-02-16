<template>
    <div class="py-1" v-if="hasStructure">
        <v-row>
            <v-col>Timbre</v-col>
            <v-spacer></v-spacer>
            <v-btn icon small @click="showLoudness = !showLoudness" :color="showLoudness ? 'white' : 'dimgrey'">
                <v-icon>mdi-equalizer</v-icon>
            </v-btn>
            <v-btn icon small @click="showHelp = !showHelp"> <v-icon color="#ccc" dark>mdi-help-box</v-icon> </v-btn>
            <Tooltip :show="showHelp">
                This visualization shows timbre in the form of a segmented graph. The vertical axis, together with
                colour, denote similarity. Height in the graph will mostly correspond to energy and brightness. A sudden
                change in timbre will show up as a break in the graph. The
                <v-icon dark small color="#ccc">mdi-equalizer</v-icon> button toggles the embedding of loudnenss in the
                visualization. <br />
                The dots shown below the graph are moments of timbral anomaly, points in the music where the timbre is
                unique and locally distinct.
            </Tooltip>
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
            <ClickableBackground :width="width" :height="height"></ClickableBackground>
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
        <hr class="divider" />
        <Events :width="width" />
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import GraphSection from "./GraphSection";
import Events from "./Events";

import ClickableBackground from "./ClickableBackground";
import Tooltip from "./Tooltip.vue";
import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
        GraphSection,
        ClickableBackground,
        Events,
        Tooltip,
    },
    data() {
        return {
            paddingTop: 10,
            sectionHeight: 25,
            showLoudness: true,
            gradientStepAmount: 8,
            showHelp: false,
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
    },
};
</script>

<style scoped>
.seeker {
    pointer-events: none;
}
.divider {
    border: 1px solid #333333;
    border-radius: 2px;
    background: #333333;
    margin: 20px 0px;
}
.timbreStructureSVG {
}
</style>
