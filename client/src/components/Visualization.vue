<template>
    <div class="vis" v-if="analysisReady">
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
            <g v-for="(section, index) in analysis.sections" :key="index+'section'">
                <rect
                :width="section.duration*scale" 
                :height="verticalScale"
                :x="50+section.start*scale"
                :y="26*(verticalScale+2)"
                :fill="index % 2 === 0 ? 'blue' : 'yellow'"
                />
                <rect
                :width="section.duration*scale" 
                :height="verticalScale"
                :x="50+section.start*scale"
                :y="27*(verticalScale+2)"
                :fill="section.mode ===1 ? 'yellow' : section.mode === 0 ? 'blue' : grey "
                />
                <rect
                :width="section.duration*scale" 
                :height="verticalScale"
                :x="50+section.start*scale"
                :y="28*(verticalScale+2)"
                :fill="pitchColorRange(section.key)"
                />
            </g> 

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

import * as colors from  '../app/colors'
import { SpotifyVisualizer } from '../app/spotifyVisualizer';

import * as player from '../app/player';
import * as app from '../app/app';
import {spotify, spotifyInit} from '../app/spotify';

var pitchColor = d3.scaleSequential().domain([0,1]).interpolator(d3.interpolateViridis);
var timbreColor = d3.scaleSequential().domain([-100,100]).interpolator(d3.interpolateViridis);
var rainbowColor = d3.scaleSequential().domain([0, 11]).interpolator(d3.interpolateRainbow);
export default {
    props: {
        track: Object,
        analysis: Object,
        analysisReady: Boolean,
    },
    data () {
        return {
            hover: 0,
            verticalScale: 15,
            windowWidth: window.innerWidth,
            spotifyVisualizer: null,
            seeker: 0, // in ms?
            power: 1,
        }
    },
    computed: {
        hasTrack() {
            return this.track !== null;
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
            const l = Math.max(0,60+db)/60;
            return l*l;
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
        refreshData () {
            this.analysisData = null;
            spotify.getAudioAnalysisForTrack(this.track.id).then((data)=>{
                this.analysisData = data;
                this.spotifyVisualizer.setData(data);
                this.spotifyVisualizer.logData();
            }).catch((err) => {
                console.log(err);
            })


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