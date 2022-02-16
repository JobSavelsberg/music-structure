<template>
    <div v-if="show" class="tooltip">
        <span>
            <slot></slot>
        </span>
    </div>
</template>

<script>
export default {
    props: ["show"],
    components: {},
    data() {
        return {
            showHelp: false,
        };
    },
    computed: {},
    watch: {},
    mounted() {},
    methods: {},
};
</script>

<style scoped>
.tooltip {
    color: #ccc;
    position: relative;
    transition: 0.5s;
    margin-left: 10px;
    margin-right: 10px;
    margin-bottom: 5px;
}
</style>
