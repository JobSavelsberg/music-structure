<template>
    <div class="py-1" v-if="hasChords">
        <Seeker class="seeker" :ref="'chordsSeeker'" :width="width" :height="height" :color="'rgb(255,255,255,0.3)'" />
        <svg v-if="hasChords" class="chordsSVG" :width="width" :height="height + chordNameHeight + 5">
            <rect
                v-for="(chord, index) in chords"
                :key="index"
                class="chord"
                stroke="black"
                stroke-width=".5"
                rx="3"
                :x="chord.start * scale"
                :y="(1 - chord.angle) * (height - blockHeight)"
                :width="(chord.end - chord.start) * scale"
                :height="blockHeight"
                :fill="color(chord)"
                @click="clickedChord(chord)"
            ></rect>
            <text :y="height + chordNameHeight + 5" :x="seekerTime * scale - 5" fill="white">
                {{ currentChord.name }}
            </text>
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
    },
    data() {
        return {
            blockHeight: 10,
            chordNameHeight: 10,
        };
    },
    computed: {
        height() {
            return this.blockHeight * 12;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        seekerTime() {
            return this.$store.getters.seeker / 1000;
        },
        hasChords() {
            return this.track && this.track.chords && this.track.chords.length > 0;
        },
        chords() {
            return this.track.chords;
        },
        currentChord() {
            return this.chords.find((chord) => this.isPlayingChord(chord, this.seekerTime)) || { name: "" };
        },
    },
    watch: {},
    mounted() {},
    methods: {
        color(chord, confidence = 1) {
            return vis.sinebowColorNormalizedRadius(chord.angle, 1, confidence);
        },
        isPlayingChord(chord) {
            return this.seekerTime >= chord.start && this.seekerTime < chord.end;
        },
        clickedChord(chord) {
            player.seekS(chord.start);
        },
    },
};
</script>

<style scoped>
.seeker {
    pointer-events: none;
}
.chord {
    transition: 0.3s;
}
.chord:hover {
    fill: white !important;
    cursor: pointer;
}
</style>
