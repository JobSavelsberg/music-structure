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
            if(this.track){
                return (this.titleHeight+this.blockHeight)*this.track.structures.length;
            }else{
                return 0;
            }
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
                structure.data.forEach((section, index) => {
                    this.zoomCanvas.drawRectWithBorder(
                        section.start,
                        y,
                        section.duration,
                        this.blockHeight,
                        vis.categoryColor(section.label),
                        1,
                        null
                    );
                    if(section.label){
                        this.zoomCanvas.drawText(section.start + 0.5, y+4 + this.blockHeight / 2, section.label);
                    }
                })
                y+= this.blockHeight;
            })
        },
    },
};
</script>

<style>
.StructureCanvas {
}
</style>
