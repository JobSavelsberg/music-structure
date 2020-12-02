<template>
    <div>
        <Seeker :width="width" :height="height" :useZoom="true" />
        <canvas
            id="StructureCanvas"
            ref="StructureCanvas"
            class="StructureCanvas pa-0 ma-0"
            :height="height"
            :width="width"
        ></canvas>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            titleHeight: 16,
            blockHeight: 20,
            zoomCanvas: null,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        height() {
            let heightSum = 0;
            if(this.track){
                if(this.track.structures){
                    this.track.structures.forEach(structure => {
                        heightSum += this.titleHeight;
                        let amountOfRows = 1;
                        if(structure.seperateByLabel){
                            amountOfRows = this.getAmountOfUniqueLabels(structure);
                        }
                        heightSum += this.blockHeight*amountOfRows;
                    })
                }
            }
            return heightSum;
        },
        zoomed() {
            return this.$store.getters.isZoomed;
        },
    },
    watch: {
        width() {
            this.zoomCanvas.setWidth(this.width);
        },
        height() {
            this.zoomCanvas.setHeight(this.height);
        },
        zoomed() {
            this.zoomCanvas.setZoomed(this.zoomed);
        },
    },
    mounted() {
        this.zoomCanvas = new ZoomCanvas(document.getElementById("StructureCanvas"));
        window.eventBus.$on("readyForVis", () => {
            this.zoomCanvas.setTrackDuration(this.track);
            this.zoomCanvas.setDrawFunction(this.drawStructure);
        });
    },
    methods: {
        drawStructure() {
            let y = 0;
            this.track.structures.forEach((structure) => {
                this.zoomCanvas.drawTitle(y+this.titleHeight-2, structure.name);
                y+= this.titleHeight;
                this.zoomCanvas.drawRectWithBorder(0,
                y,
                this.width,
                this.blockHeight*structure.labelAmount,
                "rgba(32,32,32)",
                1,
                "rgb(72,72,72)")

                if(structure.seperateByLabel){
                    structure.data.forEach((section, index) => {
                        this.drawSection(section, y + this.blockHeight * section.label);
                    })
                    y+= this.blockHeight* this.getAmountOfUniqueLabels(structure);
                }else{
                    structure.data.forEach((section, index) => {
                        this.drawSection(section, y);
                    })
                    y+= this.blockHeight;
                }
            })

           
        },
        drawSection(section, y){
            this.zoomCanvas.drawRectWithBorder(
                section.start,
                y,
                section.duration,
                this.blockHeight,
                vis.categoryColorWithOpacity(section.label,Math.sqrt(section.confidence !== undefined ? section.confidence : 1)),
                1,
                null
            );
            if(section.label !== undefined){
                this.zoomCanvas.drawText(section.start, y+4 + this.blockHeight / 2, section.label);
            }
        },
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
        }
    },
};
</script>

<style>
.StructureCanvas {
}
</style>
