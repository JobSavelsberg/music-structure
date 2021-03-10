<template>
    <div class="py-1">
        <v-row>
            <v-btn icon small @click="collapsed = !collapsed">
                <v-icon>
                    {{ collapsed ? "mdi-unfold-more-horizontal" : "mdi-unfold-less-horizontal" }}
                </v-icon>
            </v-btn>
            <p>
                Chords
            </p>
        </v-row>

        <Seeker
            v-if="hasChords"
            class="seeker"
            :ref="'chordsSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.3)'"
        />
        <svg v-if="hasChords" class="chordsSVG" :width="width" :height="height">
            <ClickableBackground :width="width" :height="height"></ClickableBackground>

            <rect
                v-for="(chord, index) in chords"
                :key="index"
                class="chord"
                stroke="black"
                stroke-width=".5"
                rx="3"
                :x="chord.start * scale"
                :y="collapsed ? '0' : ((2 - chord.angle + chordGapOffset) % 1) * (height - blockHeight)"
                :width="(chord.end - chord.start) * scale"
                :height="blockHeight"
                :fill="color(chord)"
                @click="clickedChord(chord)"
            ></rect>
        </svg>
        <canvas id="chordNameCanvas" class="chordNameCanvas" :width="width" :height="chordNameHeight"></canvas>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import Section from "./Section";
import ClickableBackground from "./ClickableBackground";
import StructureBackground from "./StructureBackground";

import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
        ClickableBackground,
    },
    data() {
        return {
            blockHeight: 10,
            chordNameHeight: 20,
            maxChordViewDistance: 10,
            canvas: null,
            ctx: null,
            collapsed: true,
        };
    },
    computed: {
        height() {
            return this.blockHeight * (this.collapsed ? 1 : 12);
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
        chordScrollMiddle() {
            return 40;
            //return this.seekerTime * this.scale;
        },
        chordGapOffset() {
            const chordTotalDuration = new Float32Array(12);

            this.chords.forEach((chord) => {
                chordTotalDuration[Math.round(chord.angle * 12)] += chord.end - chord.start;
            });

            let min = Number.POSITIVE_INFINITY;
            let minIndex = -1;
            for (let i = 0; i < 12; i++) {
                if (chordTotalDuration[i] < min) {
                    min = chordTotalDuration[i];
                    minIndex = i;
                }
            }

            log.debug("Chord total duration", chordTotalDuration);
            return minIndex / 12;
        },
    },
    watch: {
        seekerTime() {
            this.drawChordNames();
        },
        hasChords() {
            this.setupCanvas();
        },
    },
    mounted() {
        this.setupCanvas();
    },
    methods: {
        setupCanvas() {
            if (this.ctx) return;
            this.canvas = document.getElementById("chordNameCanvas");
            if (!this.canvas) {
                return;
            }
            this.canvas.width = this.width;
            this.ctx = this.canvas.getContext("2d");
            this.drawChordNames();
        },
        drawChordNames() {
            if (!this.ctx || !this.hasChords) {
                log.debug("No drawing");
                return;
            }
            this.ctx.clearRect(0, 0, this.width, this.chordNameHeight);
            this.ctx.fillStyle = "white";
            this.ctx.font = "14px Roboto";
            this.chords.forEach((chord) => {
                const chordSeekerStartOffset = chord.start - this.seekerTime;
                let startX = this.chordScrollMiddle + chordSeekerStartOffset * this.scale * 22;
                const chordSeekerEndOffset = chord.end - this.seekerTime;
                const endX = this.chordScrollMiddle + chordSeekerEndOffset * this.scale * 22;

                if (chordSeekerEndOffset > 0 && chordSeekerStartOffset < this.maxChordViewDistance) {
                    if (chord.start <= this.seekerTime) {
                        this.ctx.fillStyle = this.color(chord, 0.8);
                        this.ctx.fillRect(
                            this.chordScrollMiddle,
                            0,
                            endX - this.chordScrollMiddle - 3,
                            this.chordNameHeight
                        );
                        this.ctx.fillStyle = "white";
                        this.ctx.fillText(chord.name, this.chordScrollMiddle - 40 + 2, this.chordNameHeight - 4);
                    } else {
                        const opacity = 1 - chordSeekerStartOffset / this.maxChordViewDistance;
                        this.ctx.fillStyle = this.color(chord, opacity * 0.8);
                        this.ctx.fillRect(startX, 0, endX - startX - 3, this.chordNameHeight);
                        this.ctx.fillStyle = `rgba(255,255,255,${opacity * 1.5})`;
                        this.ctx.fillText(chord.name, startX + 2, this.chordNameHeight - 4);
                    }
                }
            });
            this.ctx.fillRect(this.chordScrollMiddle - 1, 0, 2, this.chordNameHeight);
        },
        color(chord, confidence = 1) {
            return vis.circleOfFifthsColor(chord.angle % 1, 1, confidence);
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
.chordsSVG {
    transition: 0.3s;
}
.chordsBackground {
    transition: 0.3s;
}
.chord:hover {
    fill: white !important;
    cursor: pointer;
}
</style>
