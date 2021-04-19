<template>
    <div v-if="hasStructure">
        <div class="events">
            <Seeker
                class="seeker"
                :ref="'eventseeker'"
                :width="width"
                :height="eventHeight"
                :color="'rgb(255,255,255,0.3)'"
            />

            <svg :class="`eventSVG`" :style="`margin-left: -${eventSize}`" :width="width" :height="eventHeight">
                <rect
                    class="timbreGraphBackground"
                    :width="width"
                    :height="height"
                    opacity="0"
                    @click="clickBackground($event)"
                ></rect>
                <circle
                    v-for="event in events"
                    :key="event.time"
                    class="event"
                    :ref="`event${event.time}`"
                    :cx="eventSize + event.time * scale + eventSize / 2"
                    :cy="eventSize + event.mdsFeature * (eventHeight - eventSize * 2)"
                    :r="seekerInEvent(event) ? eventSize * 1.3 : eventSize"
                    :fill="seekerInEvent(event) ? 'white' : color(event, event.confidence + 0.5)"
                    @click="clickEvent(event)"
                ></circle>
            </svg>
        </div>
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
            paddingTop: 10,
            sectionHeight: 25,
            eventSize: 6,
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
        events() {
            return this.track.events;
        },
        seeker() {
            return this.$store.getters.seeker / 1000;
        },
    },
    watch: {
        seeker(newSeeker, oldSeeker) {
            this.events.forEach((event) => {});
        },
    },
    mounted() {},
    methods: {
        color(element, confidence = 1) {
            return vis.sinebowColorNormalizedRadius(element.colorAngle, 1, confidence);
        },
        clickEvent(event) {
            player.seekS(event.time);
            this.triggerEvent(event);
        },
        clickBackground(event) {
            this.$refs["eventseeker"].clickedSVG(event);
        },
        seekerInEvent(event) {
            return this.seeker >= event.time && this.seeker < event.time + 1;
        },
    },
};
</script>

<style scoped>
.seeker {
    pointer-events: none;
}
.event {
    transition: 0.5s;
}
.event:hover {
    fill: white !important;
    cursor: pointer;
}
</style>
