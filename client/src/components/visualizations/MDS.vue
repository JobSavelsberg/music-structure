<template>
    <svg class="mdsSVG" :width="size * 2" :height="size" style="background: #222222">
        <circle
            v-for="(section, index) in sections"
            :key="index + 'mdsCourse' + section.length"
            :cx="size / 2 + (size / 2) * section.colorRadius * Math.cos(section.colorAngle * 2 * Math.PI)"
            :cy="size / 2 + (size / 2) * section.colorRadius * Math.sin(section.colorAngle * 2 * Math.PI)"
            r="4"
            :fill="sectionColor(section)"
        ></circle>
        <circle
            v-for="(section, index) in sections"
            :key="index + 'mdsCourseLin' + section.length"
            :cx="size + size / 2 + (size / 2) * section.mdsFeature"
            :cy="size / 2"
            r="4"
            :fill="sectionColor(section)"
        ></circle>
    </svg>
</template>

<script>
import * as vis from "../../app/vis";
import * as log from "../../dev/log";

export default {
    props: ["sections", "size"],
    components: {},
    data() {
        return {};
    },
    computed: {},
    watch: {},
    mounted() {},
    methods: {
        sectionColor(section) {
            return vis.sinebowColorNormalizedRadius(section.colorAngle, section.colorRadius, 1);
        },
    },
};
</script>

<style scoped></style>
