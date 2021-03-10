<template>
    <div class="pt-5">
        <v-row>
            <v-col>Harmonic Structure</v-col>
            <v-spacer></v-spacer>
            <v-btn icon small @click="showLoudness = !showLoudness" :color="showLoudness ? 'white' : 'dimgrey'">
                <v-icon>mdi-equalizer</v-icon>
            </v-btn>
        </v-row>
        <Seeker
            v-if="hasStructure"
            class="seeker"
            :ref="'holisticSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.3)'"
            :drawMarkers="false"
        />
        <svg v-if="hasStructure" class="structureSVG" :width="width" :height="height" @contextmenu.prevent="rightClick">
            <SeparatorBackground :width="width" :height="height" :scale="scale" @click="clicked" />
            <rect class="glowRect"></rect>
            <Section
                class="structureSection"
                v-for="(section, index) in courseStructure"
                :key="index + 'course'"
                :section="section"
                :height="sectionHeight"
                :scale="scale"
                :showLoudness="showLoudness"
                :coloring="'cluster'"
                :verticalOffset="paddingTop"
                :loop="false"
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
                    :coloring="'cluster'"
                    :loop="false"
                />
            </g>
            <Markers :ref="'markers'" :width="width" :height="height" :opacity="0.3"></Markers>
        </svg>
        <v-skeleton-loader
            v-if="!hasStructure"
            :width="width"
            :height="sectionHeight * 3"
            type="image"
        ></v-skeleton-loader>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import Section from "./Section";
import Markers from "./Markers";

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
        Markers,
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
            return this.track && this.track.harmonicStructureCourse && this.track.harmonicStructureCourse.length > 0;
        },
        courseStructure() {
            return this.track.harmonicStructureCourse;
        },
        fineStructure() {
            return this.track.harmonicStructureFine;
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
        rightClick(event) {
            this.$refs["holisticSeeker"].rightClick(event);
        },
        clicked(event) {
            this.$refs["holisticSeeker"].clicked(event);
        },
    },
};
</script>

<style scoped>
.structureSVG {
    z-index: 100;
}
.seeker {
    pointer-events: none;
}
.structureSection {
    z-index: 100;
}
</style>
