<template>
    <div class="py-1" v-if="hasStructure">
        <v-row>
            <v-col>Timbre Structure</v-col>
            <v-spacer></v-spacer>
            <v-btn icon small @click="showLoudness = !showLoudness" :color="showLoudness ? 'white' : 'dimgrey'">
                <v-icon>mdi-equalizer</v-icon>
            </v-btn>
        </v-row>
        <Seeker
            class="seeker"
            :ref="'timbreStructureSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.3)'"
        />
        <svg class="timbreStructureSVG" :width="width" :height="height">
            <StructureBackground :width="width" :height="height" :scale="scale" :structure="timbreStructure" />
            <Section
                v-for="(section, index) in timbreStructure"
                :key="index + 'course'"
                :section="section"
                :height="sectionHeight"
                :scale="scale"
                :showLoudness="showLoudness"
                :coloring="'circular'"
                :positioning="'linear'"
                :verticalOffset="paddingTop"
                :containerHeight="height - sectionHeight / 2"
                :loop="false"
            />
        </svg>
        <svg
            :class="`eventSVG`"
            :style="`margin-left: -${eventSize}`"
            :width="width + eventSize * 2"
            :height="eventHeight"
        >
            <circle
                v-for="event in events"
                :key="event.time"
                class="event"
                :cx="eventSize + event.time * scale"
                :cy="eventSize + event.mdsFeature * (eventHeight - eventSize * 2)"
                :r="eventSize"
                :fill="color(event, event.confidence + 0.3)"
                @click="clickEvent(event)"
            ></circle>
        </svg>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import Section from "./Section";

import StructureBackground from "./StructureBackground";

import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
        StructureBackground,
        Section,
    },
    data() {
        return {
            paddingTop: 10,
            sectionHeight: 25,
            eventSize: 5,
            eventHeight: 30,
            showLoudness: true,
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
            return this.track && this.track.timbreStructure && this.track.timbreStructure.length > 0;
        },
        timbreStructure() {
            return this.track.timbreStructure;
        },
        events() {
            return this.track.events;
        },
    },
    watch: {},
    mounted() {},
    methods: {
        color(element, confidence = 1) {
            return vis.sinebowColorNormalizedRadius(element.colorAngle, 1, confidence);
        },
        clickEvent(event) {
            player.seekS(event.time);
        },
    },
};
</script>

<style scoped>
.seeker {
    pointer-events: none;
}
.event {
    transition: 0.3s;
}
.event:hover {
    fill: white !important;
    cursor: pointer;
}
</style>
