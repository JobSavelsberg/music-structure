<template>
    <div class="pt-5">
        <v-row>
            <v-col>Repetition </v-col>

            <v-spacer></v-spacer>
            <v-btn icon small @click="showLoudness = !showLoudness" :color="showLoudness ? 'white' : 'dimgrey'">
                <v-icon>mdi-equalizer</v-icon>
            </v-btn>
            <v-btn icon small @click="catColoring = !catColoring" :color="catColoring ? 'white' : 'dimgrey'">
                <v-icon dark>mdi-palette</v-icon>
            </v-btn>
            <v-btn icon small @click="showHelp = !showHelp"> <v-icon color="#ccc" dark>mdi-help-box</v-icon> </v-btn>
            <Tooltip :show="showHelp">
                This visualization shows section blocks, where each row/group of blocks represent repeating harmonic
                sequences. For example, in many songs, a section block will represent a repeated chord progression. The
                <v-icon dark small color="#ccc">mdi-palette</v-icon> button switches colours to show either the harmonic
                sequential similarity within a group, or between groups. The
                <v-icon dark small color="#ccc">mdi-equalizer</v-icon> button toggles the embedding of loudnenss in the
                visualization.
            </Tooltip>
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
            <SeparatorBackground :width="width" :height="height" :scale="scale" />
            <rect class="clickRect" id="clickRect" :width="width" :height="height" @click="clicked"></rect>

            <rect class="glowRect"></rect>
            <Section
                class="structureSection"
                v-for="(section, index) in courseStructure"
                :key="index + 'course'"
                :section="section"
                :height="sectionHeight"
                :scale="scale"
                :showLoudness="showLoudness"
                :coloring="catColoring ? 'categoricalMDS' : 'circular'"
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
                    :coloring="'circular'"
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
        <MDS v-if="showMDS && hasStructure" :size="width / 3" :sections="courseStructure"></MDS>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import Section from "./Section";
import Markers from "./Markers";
import MDS from "./MDS";

import SeparatorBackground from "./SeparatorBackground";
import Tooltip from "./Tooltip.vue";

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
        MDS,
        Tooltip,
    },
    data() {
        return {
            paddingTop: 10,
            sectionHeight: 25,
            spaceBetweenCourseFine: 50,
            showFineStructure: false,
            showLoudness: true,
            showMDS: false,
            catColoring: false,
            showHelp: false,
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
            log.debug("Clicked");
            this.$refs["holisticSeeker"].clicked(event);
        },
        clickedHelp(event) {},
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
.clickRect {
    opacity: 0;
}
</style>
