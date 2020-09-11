<template>
    <div class="player">
        <div class="d-flex justify-center pa-4">
            <div v-if="$store.state.playerReady" >
                <v-hover v-slot:default="{ hover }" >
                    <v-btn :elevation="hover ? 5 : 0" outlined fab @click="playPause" >
                        <v-icon large>mdi-{{playing ? 'pause' : 'play'}}</v-icon>
                    </v-btn>
                </v-hover>
            </div>
            <div v-if="!$store.state.playerReady">
                <v-progress-circular
                    indeterminate
                    size=56
                ></v-progress-circular>
            </div>
        </div>
        <div id="timeseeker" v-if="!$store.state.loadingTrack">
            <svg class="waveform" :height="verticalScale" @click="clickedSVG">
                <rect v-for="(segment, index) in track.getAnalysis().segments"
                    class="loudnessBlock"
                    :key="index"
                    :width="segment.duration*scale" 
                    :height="(loudness(segment.loudness_max))*verticalScale"
                    :x="padding+segment.start*scale"
                    :y="verticalScale-loudness(segment.loudness_max)*verticalScale"
                    :fill="segment.start+segment.duration/2 < $store.state.seeker/1000 ? 'grey' : baseColor"
                />
                <rect
                    :x="padding+((seeker/1000.0)*scale)-1"
                    :y="0"
                    :width="2"
                    :height="verticalScale"
                    fill="#1DB954"
                />
            </svg>
        </div>
        <div v-if="$store.state.loadingTrack">
            <v-progress-linear
                indeterminate
                color="success"
            ></v-progress-linear>
         </div>
    </div>
</template>

<script>
import * as player from "../app/player"
import * as app from "../app/app"
import * as auth from '../app/authentication';
import * as audioUtil from '../app/audioUtil'
import Track from "../app/track"
import {spotify} from '../app/app';

export default {
    inject: ['theme'],
    props:[
        'padding',
    ],
    data () {
        return {
            verticalScale: 50,
            windowWidth: window.innerWidth,
            hover: 0,
            ending: false,
        }
    },
    beforeCreate () {
        player.initialize(auth.token, (newState) => this.stateChanged(newState));
        player.deviceIdSet().then(()=>{ 
            this.$store.commit('playerReady', true);
        })
    },
    mounted(){
        
    },
    computed: {
        track(){
            return this.$store.getters.selectedTrack;
        },
        baseColor(){
            return this.theme.isDark ? 'white' : 'black'
        },
        scale(){
            return this.width/this.track.getAnalysis().track.duration;
        },
        width(){
            return this.windowWidth - this.padding*2;
        },
        duration(){
            return Math.round(this.track.getAnalysis().track.duration*1000);
        },
        playing(){
            return this.$store.getters.playing;
        },
        seeker(){
            return this.$store.getters.seeker;
        }
    },
    watch: {
        track: 'trackChanged',
    },
    methods: {
        clickedSVG(event){
            const posX = Math.min(Math.max(0,event.clientX-this.padding)/this.width, 1);
            const ms = posX*this.duration;
            this.$store.commit('setSeeker', ms);
            player.seek(this.seeker);
        },
        trackChanged(newTrack, oldTrack){
            this.reset().then(()=>{
                player.setTrack(this.track.getUri(), 0);
                this.$store.commit('setSeeker', 0);
            });
        },
        resume () {
            if(!this.playing){
                player.resume(this.seeker).then(() => {
                    this.$store.commit('setPlaying', true);
                    this.interval = setInterval(() => this.$store.state.seeker+=33, 33);
                });
            }
        },
        pause () {
            if(this.playing){
                player.pause();
                this.$store.commit('setPlaying', false);
                clearInterval(this.interval);
            }
        },
        playPause () {
            this.playing ? this.pause() : this.resume();
        },
        async reset(){
            this.ending = false;
            return player.pause().then(() => {
                this.$store.commit('setSeeker', 0);
                clearInterval(this.interval);
                this.$store.commit('setPlaying', false);
            }).catch((err) => console.log(err));
        },
        clickedTimeSeeker () {
            player.seek(this.seekTime);
        
        },
        seekerTimer(increment){
            const now = new Date();
            let elapsed = increment
            if(this.lastTimePoll){
                elapsed = now-this.lastTimePoll;
            }
            this.lastTimePoll = now;
            this.seekTime+=elapsed;
        },
        loudness(db){
            return audioUtil.loudness(db);
        },
        stateChanged(state){
            if(this.playing){
                const {current_track, position, duration} = state;
                this.$store.commit('setSeeker', position);

                // if state gotten at the end, assume it is a stop and reset when next state position is 0
                if(this.ending && state.position === 0){
                    this.reset();
                }
                if(!this.ending && (state.duration - state.position) < 500){
                    this.ending = true;
                }
                
            }

        }
    },
    components:{
    }
}
</script>

<style>
.waveform{
  overflow: visible;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.loudnessBlock{
    transition: fill 200ms ease;
    cursor: pointer
}
</style>