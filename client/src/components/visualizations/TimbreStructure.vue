<template>
    <div class="py-5" v-if="hasStructure">
        <v-row>
            <v-col>Timbre Structure</v-col>
            <v-spacer></v-spacer>
            <v-col>
                <v-btn icon small @click="showLoudness = !showLoudness" :color="showLoudness ? 'white' : 'dimgrey'">
                    <v-icon>mdi-equalizer</v-icon>
                </v-btn>
            </v-col>
        </v-row>
        <Seeker
            class="seeker"
            :ref="'timbreStructureSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.5)'"
        />
        <svg class="timbreStructureSVG" :width="width" :height="height">
            <StructureBackground :width="width" :height="height" :scale="scale" :structure="timbreStructure" />
            <rect class="glowRect"></rect>
            <Section
                v-for="(section, index) in timbreStructure"
                :key="index + 'course'"
                :section="section"
                :height="sectionHeight"
                :scale="scale"
                :showLoudness="showLoudness"
                :coloring="'circular'"
                :positioning="'circular'"
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
            showLoudness: true,
        };
    },
    computed: {
        height() {
            return 200;
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
    },
    watch: {},
    mounted() {},
    methods: {},
};
</script>

<style scoped>
.seeker {
    pointer-events: none;
}
</style>
