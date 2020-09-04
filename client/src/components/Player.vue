<template>
    <div class="player">
        <div class="d-flex justify-center pa-4">
            <div v-if="deviceReady" >
                <v-hover v-slot:default="{ hover }" >
                    <v-btn :elevation="hover ? 5 : 0" outlined fab @click="playPause" >
                        <v-icon large>mdi-{{playing ? 'pause' : 'play'}}</v-icon>
                    </v-btn>
                </v-hover>
            </div>
            <div v-if="!deviceReady">
                <v-progress-circular
                    indeterminate
                    size=56
                ></v-progress-circular>
            </div>
        </div>
        <TimeSeeker v-if="analysisReady" v-model="seekTime" :track="track" :analysis="analysis" @clickedseeker="clickedTimeSeeker"/>
        <div v-if="!analysisReady">
            <v-progress-circular
                indeterminate
                size=56
            ></v-progress-circular>
         </div>
    </div>
</template>

<script>
import * as player from "../app/player"
import * as app from "../app/app"

import TimeSeeker from "./TimeSeeker"


export default {
    props:{
        analysisReady: Boolean,
        track: Object,
        analysis: Object,
        state: Object
    },
    data () {
        return {
            deviceReady: false,
            playing: false,
            seekTime: 0,
            interval: null,
        }
    },
    beforeCreate () {
        player.deviceIdSet().then(()=>{ 
            this.deviceReady = true
        })
    },
    mounted(){
        
    },
    computed: {
        trackReady(){
            return this.track!==null;
        }
    },
    watch: {
        track: 'trackChanged',
        state: {
            deep: true,
            handler: function(newState, oldState){ 
                this.stateChanged(); 
            }
        },
        analsysisReady: 'analysisReadyChanged',
    },
    methods: {
        resume () {
            if(!this.playing){
                player.resume(this.seekTime).then(() => {
                    this.playing = true;
                    this.interval = setInterval(() => this.seekTime+=33, 33);
                });
            }
        },
        pause () {
            if(this.playing){
                player.pause();
                this.playing = false;
                clearInterval(this.interval);
            }
        },
        playPause () {
            this.playing ? this.pause() : this.resume();
        },
        async reset(){
            return player.pause().then(() => {
                this.seekTime = 0;
                clearInterval(this.interval);
                this.playing = false;
            });
        },
        trackChanged () {
            this.reset().then(()=>{
                player.setTrack(this.track.uri, 0);
            });
        },
        clickedTimeSeeker () {
            player.seek(this.seekTime);
            
        },
        stateChanged(){
            this.seekTime = this.state.position;
        },
    },
    components:{
        TimeSeeker
    }
}
</script>

<style>
.player{

}
</style>