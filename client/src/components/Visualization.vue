<template>
    <div class="vis" v-if="!$store.state.loadingTrack">
        <svg class="svgContainer" >
            <g v-for="(segment, index) in analysis.segments" :key="index+'segment'">
                <g v-for="(n, i) in 12" :key="i+'v'">
                    <rect 
                    
                    :width="segment.duration*scale" 
                    :height="verticalScale"
                    :x="50+segment.start*scale"
                    :y="(11-i)*(verticalScale+2)"
                    :fill="pitchColorRange(segment.pitches[i])"
                    :opacity=".4+loudness(segment.loudness_max)"
                    />

                    <rect
                    :width="segment.duration*scale" 
                    :height="verticalScale"
                    :x="50+segment.start*scale"
                    :y="(13+i)*(verticalScale+2)"
                    :fill="timbreColorRange(segment.timbre[i])"
                    :opacity=".4+loudness(segment.loudness_max)"
                    />
                </g>
            </g> 
            <rect
                    :x="50+(($store.state.seeker/1000.0)*scale)-1"
                    :y="0"
                    :width="2"
                    :height="verticalScale*32"
                    fill="#ffffff"
                />
        </svg>
        <!-- <v-slider
          v-model="power"
          step="1"
          ticks="always"
        ></v-slider>-->
    </div>
</template>

<script>
import * as d3 from 'd3';
import * as audioUtil from '../app/audioUtil'

import * as colors from  '../app/colors'
import { SpotifyVisualizer } from '../app/spotifyVisualizer';

import * as player from '../app/player';
import * as app from '../app/app';

var pitchColor = d3.scaleSequential().domain([0,1]).interpolator(d3.interpolateViridis);
var timbreColor = d3.scaleSequential().domain([-100,100]).interpolator(d3.interpolateViridis);
var rainbowColor = d3.scaleSequential().domain([0, 11]).interpolator(d3.interpolateRainbow);
export default {
    data () {
        return {
            hover: 0,
            verticalScale: 7,
            windowWidth: window.innerWidth,
            spotifyVisualizer: null,
            seeker: 0, // in ms?
            power: 1,
        }
    },
    computed: {
        track(){
            return this.$store.getters.selectedTrack;
        },
        analysis(){
            return this.track.getAnalysis();
        },
        scale(){
            return (1/this.analysis.track.duration)*(this.windowWidth -100);
        }
    },
    watch: { 
        track (oldval, newval) { 
            if(newval!==null) this.refreshData();
        },
        analysisReady: 'onAnalysisReady'
    },
    mounted () {
        window.addEventListener('resize', () => {
            this.windowWidth = window.innerWidth;
        })
    },
    methods: {
        loudness(db){
            return audioUtil.loudness(db);
        },
        pitchColorRange(value){
            return pitchColor(value);
        },
        timbreColorRange(value){
            return timbreColor(value);
        },
        rainbowColorRange(value){
            return rainbowColor(value);
        },
        onAnalysisReady(){
            console.log(this.analysis);
            this.spotifyVisualizer = new SpotifyVisualizer(this.analysis);
            this.refreshData();
        },
    }
}
</script>
<style>
.vis{
    padding-top: 20px;
}
.svgContainer{
  overflow: visible;
  width: 100%;
  height: 100%;
}
</style>