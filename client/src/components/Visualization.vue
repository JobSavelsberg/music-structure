<template>
    <div>
        <h1> {{ analysisData.track.tempo }} at {{ analysisData.track.tempo_confidence }} confidence</h1>
    </div>
</template>

<script>

import * as player from '../app/player';
import * as app from '../app/app';
import {spotify, spotifyInit} from '../app/spotify';


export default {
    props: {
        track: Object,
    },
    data () {
        return {
            analysisData: null,
        }
    },
    computed: {
    },
    watch: { 
        track (oldval, newval) { 
            console.log("track");
            this.refreshData();
        }
    },
    mounted () {
        this.refreshData();
    },
    methods: {
        refreshData () {
            spotify.getAudioAnalysisForTrack(this.track.id).then((data)=>{
                console.log("got analysis data");
                this.analysisData = data;
                this.updateVisualization();
            }).catch((err) => {
                console.log(err);
            })
        },
        updateVisualization () {
            console.log(this.track.uri);
            spotify.play({uris: [this.track.uri]}).then((res) => {
                console.log(res);
            }).catch((err) => {
                console.log(err)
            })
        }
    }
}
</script>