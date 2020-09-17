<template>
    <div>
        <div class="d-flex pa-2">
            <v-row>
                <v-layout class="ml-10">
                     <v-switch
                        v-model="drawRawPitch"
                        label="Raw Pitch Data"
                        class="mx-5"
                        hide-details
                        @change="draw"
                    ></v-switch>
                    <v-switch
                        v-model="drawRawTimbre"
                        label="Raw Timbre Data"
                        class="mx-5"
                        hide-details
                        @change="draw"
                    ></v-switch>
                    <v-switch
                        v-model="drawRawRhythm"
                        label="Rhythm Data"
                        class="mx-5"
                        hide-details
                        @change="draw"
                    ></v-switch>
                    <v-switch
                        v-model="drawTonality"
                        label="Tonality"
                        class="mx-5"
                        hide-details
                        @change="draw"
                    ></v-switch>
                    <v-switch
                        v-model="drawSSM"
                        label="Similarity Matrix"
                        class="mx-5"
                        hide-details
                        @change="draw"
                    ></v-switch>
                </v-layout>
                <v-spacer/>
                <v-btn color="primary" fab dark small class="mr-10" @click="zoom">
                    <v-icon>mdi-magnify-plus-outline</v-icon>
                </v-btn>
            </v-row>


        </div>
        <div class="vis" @click="clickedVis" >
            <canvas v-show="!loadingTrack" id="visCanvas" ref="visCanvas" class="visCanvas pa-0 ma-0"  ></canvas>
            <svg  v-if="!loadingTrack" class="svgContainer" >
                <rect
                    :x="this.zoomed ? this.padding + this.canvasWidth/2 : padding+((this.seeker/1000.0)*scale)-1"
                    :y="0"
                    :width="2"
                    :height="canvasHeight"
                    fill="#ffffff"
                    :opacity="0.5"
                />
                <g v-if="drawClusters">
                    <rect  v-for="(segment, index) in segments" :key="index"
                    :x="padding+segment.start*scale"
                    :y="clusterY+segment.cluster*10"
                    :width="segment.duration*scale"
                    :height="10"
                    :fill="clusterColor(segment.cluster)"
                    @click="clickedCluster(segment.cluster, segment)"
                    />
                </g>
            </svg>
            <svg  v-if="!loadingTrack && $store.state.tsneReady" class="tsneContainer" >
                <circle v-for="(segment, index) in segments" :key="index"
                :class="playingSegment(segment) ? 'segmentCirclePlaying' : 'segmentCircle'"
                :r="(3+segment.duration*3) * (playingSegment(segment) ? 3: 1)"
                :cx="padding+(segment.tsneCoord[0]+1)*400"
                :cy="tsneHeightOffset+(segment.tsneCoord[1]+1)*400"
                :fill="playingSegment(segment)? 'white': clusterColor(segment.cluster)"
                @click="clickedSegment(segment)"
                />
            </svg>

        </div>
    </div>
</template>

<script>
import * as d3 from 'd3';
import * as audioUtil from '../app/audioUtil'

import * as player from '../app/player';
import * as app from '../app/app';
import * as vis from '../app/vis'
import Segment from '../app/Segment';

const d3ClusterColor = d3.scaleOrdinal(d3.schemeCategory10);
export default {
    props:[
        'padding'
    ],
    data () {
        return {
            canvas: null,
            ctx: null,
            hover: 0,
            windowWidth: window.innerWidth,
            spotifyVisualizer: null,
            power: 1,
            drawRawPitch: true,
            drawRawTimbre: true,
            drawSSM: false,
            drawTonality: true,
            drawRawRhythm: true,
            drawClusters: true,
            clusterY: 0,
            zoomed: false,
            scaleX: 4,

        }
    },
    computed: {
        track(){
            return this.$store.getters.selectedTrack;
        },
        analysis(){
            return this.track.getAnalysis();
        },
        segments(){
            return this.track.getSegments();
        },
        scale(){
            return this.width/this.analysis.track.duration;
        },
        width(){
            return (this.windowWidth)*(this.zoomed ? this.scaleX : 1)-this.padding*2;
        },
        canvasWidth(){
            return this.windowWidth-this.padding*2;
        },
        canvasHeight(){
            return 2500;
        },
        loadingTrack(){
            return this.$store.state.loadingTrack
        },
        duration(){
            return Math.round(this.track.getAnalysis().track.duration*1000);
        },
        seeker(){
            return this.$store.state.seeker;
        },
        tsneHeightOffset(){
            return this.clusterY+100;
        },
    },
    watch: { 
        loadingTrack: 'loadingTrackChanged',
        seeker: 'seekerChanged',
    },
    mounted () {
        window.addEventListener('resize', () => {
            this.windowWidth = window.innerWidth;
            this.setupCanvas(document.getElementById('visCanvas'));
        })
        this.setupCanvas(document.getElementById('visCanvas'));

    },
    methods: {
        clickedVis(event){
            if(!event.clientY > this.clusterY && !event.clientY < this.clusterY+100){
                const posX = Math.min(Math.max(0,event.clientX-this.padding)/this.width, 1);
                const ms = posX*this.duration;
                this.$store.commit('setSeeker', ms);
                player.seek(ms);
            }

        },
        loudness(db){
            return audioUtil.loudness(db);
        },
        pitchColorRange(value){
            return vis.pitchColor(value);
        },
        timbreColorRange(value){
            return vis.timbreColor(value);
        },
        rainbowColorRange(value){
            return vis.rainbowColor(value);
        },
        clusterColor(cluster){
            return d3ClusterColor(cluster);
        },
        loadingTrackChanged(newVal, oldVal){
            if(this.loadingTrack === false){
                this.draw(0);
            }
        },
        setupCanvas(canvas){
            if(!canvas){
                console.log("canvas not ready"); 
                return;
            } 
            console.log("canvas ready: draw()");
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");

            // get current size of the canvas
            let rect = canvas.getBoundingClientRect();

            // increase the actual size of our canvas
            this.canvas.width = this.windowWidth * devicePixelRatio;
            this.canvas.height = this.canvasHeight * devicePixelRatio;

            // ensure all drawing operations are scaled
            this.ctx.scale(devicePixelRatio, devicePixelRatio);

            // scale everything down using CSS
            this.canvas.style.width = this.windowWidth + 'px';
            this.canvas.style.height = this.canvasHeight + 'px';

            
            this.ctx.webkitImageSmoothingEnabled = false;
            this.ctx.mozImageSmoothingEnabled = false;
            this.ctx.imageSmoothingEnabled = false;

            //this.draw();
        },
        draw(xOffset){
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            let y = 0;

            if(this.drawRawPitch){
                vis.renderRawPitch(this.track, this.padding - xOffset, this.width, y, 150, this.ctx)
                y += 155;
                vis.renderPercussionPitch(this.track, this.padding - xOffset, this.width, y, 50, this.ctx)
                y += 55;
                vis.renderProcessedPitch(this.track, this.padding - xOffset, this.width, y, 150, this.ctx)
                y += 155;
            }
            if(this.drawRawTimbre){
                vis.renderRawTimbre(this.track, this.padding- xOffset, this.width, y, 150, this.ctx)
                y += 155;
            }
            if(this.drawRawRhythm){
                vis.renderRawRhythm(this.track, this.padding- xOffset, this.width, y, 30, this.ctx)
                y += 35;
            }
            if(this.drawTonality){
                vis.renderTonality(this.track, this.padding- xOffset, this.width, y, 25, this.ctx)
                y += 30;
            }
            if(this.drawClusters){
                this.clusterY = y;
                y += 10*10;
            }
            if(this.drawSSM){
                vis.renderSSM(this.track, this.padding- xOffset, this.width, y, this.width, this.ctx)
                y+= this.width+5;
            }
        },
        zoom(){
            console.log("zooming")
            //this.transform();
            this.zoomed = !this.zoomed;
            this.redraw();
        },
        redraw(){
            const xOffset = (this.seeker/1000.0)*this.width/this.analysis.track.duration;
            const offsetToMiddle = this.canvasWidth/2;
            this.draw(this.zoomed ? xOffset - offsetToMiddle  : 0);
        },
        seekerChanged(newSeek, oldSeek){
            if(this.zoomed){
                this.redraw();
            }
        },
        transform(){
            this.ctx.save();
            this.ctx.translate(this.width*0.5, this.canvasHeight*0.5);
            this.ctx.scale(2, 2);
            this.ctx.drawImage(this.canvas, -this.width*0.5, -this.canvasHeight*0.5);
            this.ctx.restore();
        },
        clickedCluster(clusterIndex, segment){
            console.log("playing cluster", clusterIndex);
            let totalDuration = 0;
            const clusterSize = this.track.clusters[clusterIndex].length;
            const randomSegmentIndex = Math.floor(Math.random()*clusterSize);
            const randomSegment = segment//this.track.clusters[clusterIndex][randomSegmentIndex];
            console.log(randomSegment.start);
            player.playSegment(randomSegment)
            this.$store.commit('setSeeker', randomSegment.start*1000);

        },
        clickedSegment(segment){
            player.playSegment(segment)
            this.$store.commit('setSeeker', segment.start*1000);
        },
        playingSegment(segment){
            return this.seeker/1000 >= segment.start && this.seeker/1000 < segment.start+segment.duration-0.01 
        }
    }
}
</script>
<style>
.vis{
    padding-top: 10px;
    position: relative;
}
.visCanvas{
    image-rendering: optimizeSpeed;       
    image-rendering: -moz-crisp-edges;       
    image-rendering: -webkit-optimize-contrast; 
    image-rendering: -o-crisp-edges;            
    image-rendering: crisp-edges;               
    -ms-interpolation-mode: nearest-neighbor;  
}
.svgContainer{
    position: absolute;
    padding-top: 10px;
    top: 0px;
    left:0px;
    z-index: 2;
    height: 100%;
    width: 100%;
}
.tsneContainer{
    position: absolute;
    padding-top: 10px;
    top: 0px;
    left:0px;
    z-index: 2;
    height: 100%;
    width: 100%;
}
.segmentCircle{
    transition: r 1.5s ease-out, fill 1.5s ease-out;
}
.segmentCirclePlaying{
    transition: r .15s ease-in, fill .15s ease-in;
}
</style>