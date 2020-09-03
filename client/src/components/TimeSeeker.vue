<template>

<div>
    <svg class="svgContainer" :height="verticalScale">
        <rect v-for="(segment, index) in analysis.segments"
            class="loudnessBlock"
            :key="index"
            :width="segment.duration*scale" 
            :height="(loudness(segment.loudness_max))*verticalScale"
            :x="50+segment.start*scale"
            :y="verticalScale-loudness(segment.loudness_max)*verticalScale"
            :fill="segment.start+segment.duration/2 < seek/1000 ? 'grey' : baseColor"
            @mouseover="hover = index"
            @click="clicked(segment)"
        />
        <rect
            :x="50+seek/1000*scale-1"
            :y="0"
            :width="2"
            :height="verticalScale"
            fill="grey"
        />
    </svg>
</div>
</template>

<script>



export default {
    inject: ['theme'],
    props:{
        value: Number,
        track: Object,
        analysis: Object,
    },
    data() {
        return {
            verticalScale: 50,
            windowWidth: window.innerWidth,
            hover: 0,
            seek: this.value,
        }
    },
    mounted() {
        window.addEventListener('resize', () => {
            this.windowWidth = window.innerWidth;
        })
        this.hover = 0;
        this.seek = 0; // in ms
        this.$emit('input', 0);

    },
    watch:{
        value: 'valueChanged',
        track: 'changedTrack'
    },
    computed: {
        baseColor(){
            return this.theme.isDark ? 'white' : 'black'
        },
        scale(){
            return (1/this.analysis.track.duration)*(this.windowWidth -100);
        }
    },
    methods:{
        loudness(db){
            const l = Math.max(0,60+db)/60;
            return l*l;
        },
        clicked(segment){
            const ms = Math.round(segment.start*1000);
            this.seek =  ms;
            this.$emit('input', ms);
            this.$emit('clicked');
        },
        valueChanged(){
            this.seek = this.value;
        },
        changedTrack(){
            this.hover = 0;
            this.seek = 0; // in ms
            this.$emit('input', 0);
        }
    }
}
</script>


<style>
.svgContainer{
  overflow: visible;
  width: 100%;
  height: 100%;
}
.loudnessBlock{
    transition: fill 300ms ease;
}
</style>