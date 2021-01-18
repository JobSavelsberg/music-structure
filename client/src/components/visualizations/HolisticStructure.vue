<template>
    <div class="py-5" v-if="hasStructure">
        <v-row>
            <v-col>Harmonic Structure</v-col>
            <v-spacer></v-spacer>
            <v-col>
                <v-btn icon small @click="showLoudness = !showLoudness" :color="showLoudness ? 'white' : 'dimgrey'">
                    <v-icon>mdi-equalizer</v-icon>
                </v-btn>
            </v-col>
        </v-row>
        <Seeker
            class="seeker"
            :ref="'holisticSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.5)'"
        />
        <svg class="structureSVG" :width="width" :height="height">
            <SeparatorBackground :width="width" :height="height" :scale="scale" />
            <rect class="glowRect"></rect>
            <Section
                v-for="(section, index) in courseStructure"
                :key="index + 'course'"
                :section="section"
                :height="sectionHeight"
                :scale="scale"
                :showLoudness="showLoudness"
                :coloring="'circular'"
                :verticalOffset="paddingTop"
            />
            <g v-if="showFineStructure">
                <Section
                    v-for="(section, index) in fineStructure"
                    :key="index + 'fine'"
                    :section="section"
                    :height="sectionHeight"
                    :scale="scale"
                    :verticalOffset="paddingTop + spaceBetweenCourseFine + sectionHeight * groupAmount(courseStructure)"
                    :showLoudness="showLoudness"
                    :coloring="'circular'"
                />
            </g>
        </svg>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import Section from "./Section";

import SeparatorBackground from "./SeparatorBackground";

import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
        SeparatorBackground,
        Section,
    },
    data() {
        return {
            paddingTop: 10,
            sectionHeight: 25,
            spaceBetweenCourseFine: 50,
            showFineStructure: false,
            showLoudness: true,
        };
    },
    computed: {
        height() {
            let height = 0;
            height += this.paddingTop;
            height += this.groupAmount(this.courseStructure) * this.sectionHeight;
            height += this.spaceBetweenCourseFine;
            if (this.showFineStructure) {
                height += this.groupAmount(this.fineStructure) * this.sectionHeight;
            }
            return height;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        hasStructure() {
            return this.track && this.track.structures.length > 0;
        },
        courseStructure() {
            return this.track.courseStructure;
        },
        fineStructure() {
            return this.track.fineStructure;
        },
    },
    watch: {},
    mounted() {},
    methods: {
        groupAmount(structure) {
            let maxGroupID = 0;
            for (let i = 0; i < structure.length; i++) {
                if (structure[i].groupID > maxGroupID) {
                    maxGroupID = structure[i].groupID;
                }
            }
            return maxGroupID + 1;
        },
    },
};
</script>

<style scoped>
.structureSVG {
}
.seeker {
    pointer-events: none;
}
</style>
