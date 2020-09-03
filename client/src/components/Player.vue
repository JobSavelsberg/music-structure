<template>
    <div class="player">
        <div class="d-flex justify-center pa-4">
            <div v-if="ready" >
                <v-hover v-slot:default="{ hover }" >
                    <v-btn :elevation="hover ? 5 : 0" outlined fab @click="playPause" >
                        <v-icon large>mdi-{{playing ? 'pause' : 'play'}}</v-icon>
                    </v-btn>
                </v-hover>
            </div>
            <div v-if="!ready">
                <v-progress-circular
                    indeterminate
                    size=56
                ></v-progress-circular>
            </div>
        </div>
        <TimeSeeker v-model="seekTime" :track="track" :analysis="analysis" @clicked="clickedTimeSeeker"/>
    </div>
</template>

<script>
import * as player from "../app/player"
import * as app from "../app/app"

import TimeSeeker from "./TimeSeeker"


export default {
    props:{
        track: Object,
        analysis: Object,
        state: Object
    },
    data () {
        return {
            ready: false,
            playing: false,
            seekTime: 0,
            interval: null,
        }
    },
    beforeCreate () {
        player.deviceIdSet().then(()=>{ 
            this.ready = true
        })
    },
    mounted(){
        player.setTrack(this.track.uri);
    },
    watch: {
        track: 'trackChanged',
        state: {
            deep: true,
            handler: function(newState, oldState){ 
                this.stateChanged(); 
            }
        }
    },
    methods: {
        play () {
            if(!this.playing){
                player.play();
                this.playing = true;
                this.interval = setInterval(() => this.seekTime+=33, 33);
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
            this.playing ? this.pause() : this.play();
        },
        trackChanged () {
            this.pause();
            player.setTrack(this.track.uri)
        },
        clickedTimeSeeker () {
            
            player.seek(this.seekTime).then((res) => {
                if(!this.playing) this.play();
            }).catch((err)=> {
                console.log(err)
            })
        },
        stateChanged(){
            this.seekTime = this.state.position;
        }


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