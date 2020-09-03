<template>
    <div v-if="hasAnalysisData">
        <v-divider></v-divider>
        <svg class="svgContainer">

            <rect v-for="(segment, index) in analysisData.segments"
                class="volumeBar"
                :key="index"
                :width="segment.duration*scale" 
                :height="(loudness(segment.loudness_max))*verticalScale"
                :x="segment.start*scale"
                :y="verticalScale-loudness(segment.loudness_max)*verticalScale"
                :fill="hover === index ? 'grey' :'black'"
                @mouseover="hover = index"
                @click="clicked(segment)"
            />
        </svg>
         <v-slider
          v-model="power"
          step="1"
          ticks="always"
        ></v-slider>
    </div>
</template>

<script>
import * as colors from  '../app/colors'
import { SpotifyVisualizer } from '../app/spotifyVisualizer';

import * as player from '../app/player';
import * as app from '../app/app';
import {spotify, spotifyInit} from '../app/spotify';


export default {
    props: {
        track: Object,
    },
    data () {
        return {
            hover: 0,
            verticalScale: 150,
            horizontalScale: 1.9,
            analysisData: null,
            spotifyVisualizer: null,
            seeker: 0, // in ms?
            power: 1,
        }
    },
    computed: {
        hasTrack() {
            return this.track !== null;
        },
        hasAnalysisData(){
            return this.analysisData !== null;
        },
        scale(){
            return 1e6/this.track.duration_ms * this.horizontalScale;
        }
    },
    watch: { 
        track (oldval, newval) { 
            if(newval!==null) this.refreshData();
        }
    },
    mounted () {
        this.spotifyVisualizer = new SpotifyVisualizer(this.analysisData);
        this.refreshData();
    },
    methods: {
        loudness(db){
            const l = Math.max(0,60+db)/60;
            return Math.pow(l,this.power);
        },
        getColor (segment) {
            let randomColor = colors.getRandomColor();
            randomColor = "black"
            return randomColor;
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
        clicked(segment){
            const ms = Math.round(segment.start*1000);
            spotify.seek(ms).then((res) => {
                //console.log(res);
            }).catch((err)=> {
                console.log(err)
            })
        },      
    }
}
</script>
<style>
.svgContainer{
  overflow: visible;
  width: 100%;
  height: 100%;
}
</style>