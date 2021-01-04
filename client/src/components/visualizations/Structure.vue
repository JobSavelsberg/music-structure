<template>
    <div>
        <div v-if="hasStructure">
            <div class="structure" v-for="structure in track.structures" :key="structure.name" >
                <v-row class="mb-0 pt-2">
                    <v-btn v-if="!structure.seperateByGroup" icon small  @click="clickStructureUnfold(structure)">
                        <v-icon>
                            {{structure.verticalPosition ? "mdi-unfold-less-horizontal" : "mdi-unfold-more-horizontal"}}
                        </v-icon>
                    </v-btn>
                    <p>{{structure.name}} </p>
                </v-row>
    
                <Seeker class="seeker" :ref="'seeker'+structure.name" :width="width" :height="heightOfStructure(structure)" />
                <svg class="structureSVG" :width="width" :height="heightOfStructure(structure)" @mouseout="unhover()">
                    <rect class="structureBackground" x="0" y="0" :width="width" :height="heightOfStructure(structure)" @click="clickBackground($event, structure)"  @mouseover="unhover()" @mouseout="unhover()" fill="#1a1a1a">
                    </rect>
                    <g v-for="(section, index) in structure.data" :key="index">
                        <rect class="section" stroke="black" stroke-width=".5" rx="5" 
                        @mouseover="hoverSection($event, section, structure)"
                         @mouseout="unhoverSection(section)" 
                         @click="clickSection($event, section)" 
                         :x="section.start*scale" 
                         :y="structure.verticalPosition ? sectionVerticalPosition(section) : structure.seperateByGroup ? section.groupID*blockHeight: 0" 
                         :width="(section.end-section.start)*scale" 
                         :height="blockHeight"  
                         :fill="sectionColor(section)">
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
import Vue from 'vue';

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
            verticalPositionScale: 3,
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
            if(structure.groupAmount) return structure.groupAmount;
            const groupIDs = [];
            log.debug("Getting amount of unique groupIDs", structure)
            structure.data.forEach((section, index) => {
                if(!groupIDs.includes(section.groupID)){
                    groupIDs.push(section.groupID)
                }
            });
            return groupIDs.length;
        },
        heightOfStructure(structure){
            return (structure.verticalPosition ? this.verticalPositionScale+1 : structure.seperateByGroup ? this.getAmountOfUniqueLabels(structure) : 1)*this.blockHeight;
        },
        sectionColor(section){
            if(section.colorAngle !== undefined){
                return vis.sinebowColorNormalizedRadius(section.colorAngle,section.colorRadius);
            }else{
                return vis.categoryColorWithOpacity(section.groupID,Math.sqrt(section.confidence !== undefined ? section.confidence : 1));
            }
        },
        sectionVerticalPosition(section){
            if(section.colorAngle !== undefined){
                return section.colorAngle*this.blockHeight*this.verticalPositionScale;
            }else{
                return section.groupID*this.blockHeight;
            }  
        },
        sectionBorderColor(section){
            return vis.categoryColorWithOpacity(section.groupID,Math.max(0,Math.sqrt(section.confidence !== undefined ? section.confidence : 1)-0.5));
        },
        hoverSection(event, section, structure){
            this.tooltipTimeout = setTimeout(() => {
                this.toolTipText = `
                Label: ${section.groupID} <br /> 
                Confidence: ${parseFloat(section.confidence).toFixed(2)} <br /> 
                [${parseFloat(section.start).toFixed(2)}, ${parseFloat(section.end).toFixed(2)}] <br /> 
                Duration: ${parseFloat(section.end-section.start).toFixed(2)} <br /> 
                NormScore: ${parseFloat(section.normalizedScore).toFixed(2)} <br /> 
                NormCoverage: ${parseFloat(section.normalizedCoverage).toFixed(2)} <br /> 
                Fitness: ${parseFloat(section.fitness).toFixed(2)}
                `
                setTimeout(() => {
                    let tooltips = document.getElementsByClassName("v-tooltip__content");
                    tooltips.forEach(tool => {
                        tool.style.left = event.pageX - event.offsetX + section.start*this.scale +  'px'
                        tool.style.top = event.pageY - event.offsetY + (structure.seperateByGroup ? section.groupID+1 : 1)*this.blockHeight + 'px'
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
        },
        clickStructureUnfold(structure){
            if(structure.verticalPosition === undefined){
                // To make object reactive
                Vue.set(structure, 'verticalPosition', true)
            }else{
                structure.verticalPosition = !structure.verticalPosition;
            } 
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
    transition: height 0.4s;
}
.structureBackground{
    transition: height 0.4s;
}
.section{
	pointer-events: all;
    transition: fill 0.3s, y 0.4s;

}
.section:hover{
    fill: white!important;
    cursor:pointer;
}
.tooltip{
    white-space: pre-line !important;
}



</style>
