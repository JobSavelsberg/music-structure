<template>
    <div>
        <div v-if="hasStructure">
            <div class="structure" v-for="structure in track.structures" :key="structure.name" >
                <p>{{structure.name}}</p>
                <Seeker class="seeker" :ref="'seeker'+structure.name" :width="width" :height="heightOfStructure(structure)" />
                <svg class="structureSVG" :width="width" :height="heightOfStructure(structure)" @mouseout="unhover()">
                    <rect x="0" y="0" :width="width" :height="heightOfStructure(structure)" @click="clickBackground($event, structure)"  @mouseover="unhover()" @mouseout="unhover()" fill="#1a1a1a">
                    </rect>
                    <g v-for="section in structure.data" :key="structure.name+section.start+section.label">
                        <rect class="section" stroke="black" stroke-width=".5" rx="5" @mouseover="hoverSection($event, section, structure)" @mouseout="unhoverSection(section)" @click="clickSection($event, section)" :x="section.start*scale" :y="structure.seperateByLabel ? section.label*blockHeight: 0" :width="section.duration*scale" :height="blockHeight"  :fill="sectionColor(section)">
                        </rect>                        
                    </g>
                </svg>
            </div>
            <v-tooltip id="tooltip" class="tooltip" v-model="showTooltip" bottom><div v-html="toolTipText"></div></v-tooltip>
        </div>
       
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            titleHeight: 16,
            blockHeight: 20,
            showTooltip: false,
            tooltipTimeout: null,
            toolTipText: "",
            tooltipTime: 200,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        zoomed() {
            return this.$store.getters.isZoomed;
        },
        hasStructure(){
            return this.track && this.track.structures.length > 0;
        },
        scale(){
            return this.width / this.track.getAnalysisDuration()
        }
    },
    watch: {
    },
    mounted() {

    },
    methods: {
        getAmountOfUniqueLabels(structure){
            if(structure.labelAmount) return structure.labelAmount;
            const labels = [];
            log.debug("Getting amount of unique labels", structure)
            structure.data.forEach((section, index) => {
                if(!labels.includes(section.label)){
                    labels.push(section.label)
                }
            });
            return labels.length;
        },
        heightOfStructure(structure){
            return (structure.seperateByLabel ? this.getAmountOfUniqueLabels(structure) : 1)*this.blockHeight;
        },
        sectionColor(section){
            return vis.categoryColorWithOpacity(section.label,Math.sqrt(section.confidence !== undefined ? section.confidence : 1));
        },
        sectionBorderColor(section){
            return vis.categoryColorWithOpacity(section.label,Math.max(0,Math.sqrt(section.confidence !== undefined ? section.confidence : 1)-0.5));
        },
        hoverSection(event, section, structure){
            this.tooltipTimeout = setTimeout(() => {
                this.toolTipText = `
                Label: ${section.label} <br /> 
                Confidence: ${parseFloat(section.confidence).toFixed(2)}
                `
                setTimeout(() => {
                    let tooltips = document.getElementsByClassName("v-tooltip__content");
                    tooltips.forEach(tool => {
                        tool.style.left = event.pageX - event.offsetX + section.start*this.scale +  'px'
                        tool.style.top = event.pageY - event.offsetY + (structure.seperateByLabel ? section.label+1 : 1)*this.blockHeight + 'px'
                    })
                },0)
                this.showTooltip = true}
            , this.tooltipTime)
        },
        unhoverSection(section){
            this.unhover()
        },
        unhover(){
            this.showTooltip = false;
            clearTimeout(this.tooltipTimeout)
        },
        clickSection(event, section){
            if (event.shiftKey){
                const startInSamples = section.start / this.track.features.sampleDuration;
                const endInSamples = section.end / this.track.features.sampleDuration;
                this.track.updateDTW(startInSamples, endInSamples)
            }else{
                player.seekS(section.start);
            }
        },
        clickBackground( event, structure){
             this.$refs["seeker"+structure.name][0].clickedSVG(event)
        }
    },
};
</script>

<style scoped>
.seeker{
    pointer-events: none;

}
.structureSVG{
    pointer-events: all;
}
.section{
	pointer-events: all;
    transition: fill 0.3s;

}
.section:hover{
    fill: white!important;
    cursor:pointer;
}
.tooltip{
    white-space: pre-line !important;
}



</style>
