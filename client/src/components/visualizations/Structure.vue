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
                    <v-btn icon small @click="clickStructureshowLoudness(structure)" :color="structure.showLoudness ? 'white' : 'dimgrey'">
                        <v-icon>mdi-equalizer</v-icon>
                    </v-btn>
                    <p>{{structure.name}} </p>
                </v-row>
    
                <Seeker class="seeker" :ref="'seeker'+structure.name" :width="width" :height="heightOfStructure(structure)" />
                <svg class="structureSVG" :width="width" :height="heightOfStructure(structure)" @mouseout="unhover()">
                    <rect class="structureBackground" x="0" y="0" :width="width" :height="heightOfStructure(structure)" @click="clickBackground($event, structure)"  @mouseover="unhover()" @mouseout="unhover()" fill="#1a1a1a">
                    </rect>
                    <g v-for="(section, index) in structure.data" :key="index">
                        <rect v-if="!structure.showLoudness" class="section" stroke="black" stroke-width=".5" rx="5" 
                        @mouseover="hoverSection($event, section, structure)"
                         @mouseout="unhoverSection(section)" 
                         @click="clickSection($event, section)" 
                         :x="section.start*scale" 
                         :y="sectionVerticalPosition(structure, section)" 
                         :width="(section.end-section.start)*scale" 
                         :height="blockHeight"  
                         :fill="sectionColor(section)">
                        </rect>      
                        <path v-if="structure.showLoudness" class="shapedSection"
                        :d="generatePointsForShapedSection(structure, section)"
                        @mouseover="hoverSection($event, section, structure)"
                         @mouseout="unhoverSection(section)" 
                         @click="clickSection($event, section)"   
                         :fill="sectionColor(section)">
                        </path>                        
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
            verticalPositionScale: 4.5,
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
        },
        averageLoudness(){
            return this.track && this.track.features.sampled.smoothedAvgLoudness;
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
        sectionVerticalPosition(structure, section){
            if(structure.verticalPosition){
                if(section.colorAngle !== undefined){
                    return section.colorAngle*this.blockHeight*this.verticalPositionScale;
                }else{
                    return section.groupID*this.blockHeight;
                }  
            }else if(structure.seperateByGroup){
                return section.groupID*this.blockHeight
            }else{
                return 0;
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
                ColorAngle: ${parseFloat(section.colorAngle).toFixed(2)} <br />
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
        },
        clickStructureshowLoudness(structure){
            if(structure.showLoudness === undefined){
                // To make object reactive
                Vue.set(structure, 'showLoudness', true)
            }else{
                structure.showLoudness = !structure.showLoudness;
            } 
        },
        generatePointsForShapedSection(structure, section){

            const x=Math.round(section.start*this.scale);
            const y=this.sectionVerticalPosition(structure, section);
            const width=Math.round((section.end-section.start)*this.scale);
            const halfHeight=this.blockHeight/2
            const yMid = y+halfHeight;
            const heightFactor = 1/this.track.features.maxLoudness;

            const startInSamples = Math.floor(section.start / this.track.features.sampleDuration);
            const endInSamples = Math.floor(section.end / this.track.features.sampleDuration);
            const durationInSamples = endInSamples - startInSamples;
            
            const sampleSkip = 3;
            let rx = 1; // in pixels
            if(width < rx*2+sampleSkip){
                rx = Math.max(0,Math.floor((width-sampleSkip)/2));
            }
            const sampleAmount = this.track.features.sampleAmount;
            const endOffsetInSamples = Math.round(rx/this.width*sampleAmount); // scale with sampleamount
            const endOffsetAbsolute = rx;


           
            const startYHalfNeg = Math.round(yMid-.8*this.averageLoudness[endOffsetInSamples]*halfHeight*heightFactor);
            const startYPNeg = Math.round(yMid-this.averageLoudness[endOffsetInSamples]*halfHeight*heightFactor);
            let points = `M ${x} ${Math.round(yMid)} L ${x} ${startYHalfNeg} Q ${x} ${startYPNeg}`;

            for(let i = startInSamples; i < endInSamples; i++){
                if(i===startInSamples+endOffsetInSamples ){
                    const pointX = Math.round(x+( (i-startInSamples)/durationInSamples)*width);
                    const pointY = Math.round(yMid-this.averageLoudness[i]*halfHeight*heightFactor);
                    points = points.concat(", ",pointX, " ",pointY);
                }else if(i===endInSamples-1-endOffsetInSamples){
                    const pointX = Math.round(x+( (i-startInSamples)/durationInSamples)*width);
                    const pointY = Math.round(yMid-this.averageLoudness[i]*halfHeight*heightFactor);
                    points = points.concat(" L ",pointX, " ",pointY);
                    points = points.concat(" Q ",Math.round(x+width-1), " ",pointY, ",", Math.round(x+width-1), " ", yMid);
                }else if(i > startInSamples+endOffsetInSamples && i < endInSamples-1-endOffsetInSamples && i%sampleSkip===0){
                    const pointX = Math.round(x+( (i-startInSamples)/durationInSamples)*width);
                    const pointY = Math.round(yMid-this.averageLoudness[i]*halfHeight*heightFactor);
                    points = points.concat(" L ",pointX, " ",pointY);
                }
            }
            for(let i = endInSamples-1; i >= startInSamples; i--){
                if(i===endInSamples-1-endOffsetInSamples){
                    const pointX = Math.round(x+( (i-startInSamples)/durationInSamples)*width);
                    const pointY = Math.round(yMid+this.averageLoudness[i]*halfHeight*heightFactor);
                    points = points.concat(" Q ", Math.round(x+width-1), " ", pointY, ",", pointX, " ",pointY);
                }else if(i===startInSamples+endOffsetInSamples){
                    const pointX = Math.round(x+( (i-startInSamples)/durationInSamples)*width);
                    const pointY = Math.round(yMid+this.averageLoudness[i]*halfHeight*heightFactor);
                    points = points.concat(" L ",pointX, " ",pointY);
                }else if(i > startInSamples+endOffsetInSamples && i < endInSamples-1-endOffsetInSamples &&i%sampleSkip===0){
                    const pointX = Math.round(x+( (i-startInSamples)/durationInSamples)*width);
                    const pointY = Math.round(yMid+this.averageLoudness[i]*halfHeight*heightFactor);
                    points = points.concat(" L ",pointX, " ",pointY);
                }
            }
            
            const startYHalfPos = Math.round(yMid+.8*this.averageLoudness[endOffsetInSamples]*halfHeight*heightFactor);
            const startYPos = Math.round(yMid+this.averageLoudness[endOffsetInSamples]*halfHeight*heightFactor);
            points = points.concat(` Q ${x} ${startYPos}, ${x} ${startYHalfPos} Z`)
            //log.debug(points)
            return points;
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
.shapedSection{
	pointer-events: all;
    transition: 0.3s;
    stroke-linejoin: round;
}
.shapedSection:hover{
    fill: white!important;
    cursor:pointer;
}
.section:hover{
    fill: white!important;
    cursor:pointer;
}
.tooltip{
    white-space: pre-line !important;
}



</style>
