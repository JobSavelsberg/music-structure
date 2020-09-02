<template>
    <v-card :style="cardStyle" :class="active ? 'elevation-3' : 'elevation-0'">
        <div class="track" v-ripple @click="clicked">
            <v-img
                :height="imgSize"
                :width="imgSize"
                :src="album.album.images[imgIndex].url"
            ></v-img>
            <v-card-text class="pl-2 py-0 pt-1 ml-0 my-0">
                <div class="text-subtitle-2 text--primary text-truncate " >{{ album.name }}</div>  
            </v-card-text>
        </div>
        <v-card-actions class="pl-0 py-0 ml-0 my-0">
            <v-btn
            class="artistButton"
            text
            color="grey"
            small
            >
            <span
            class="artistButtonText text-caption text-truncate"
            :style="{'max-width': this.imgSize-12 + 'px'}"
            >
                {{album.artists[0].name }}
                </span>
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script>
export default {
    props: [
        'album',
        'imgSize',
        'active'
    ],
    data () {
        return {
            
        }
    },
    mounted () {
        console.log(this.album);
    },
    computed: {
        imgIndex () {
            if(this.size <= this.album.album.images[2].height) return 2;
            if(this.size <= this.album.album.images[1].height) return 1;
            return 0
        },
        cardStyle () {
            return {
                'width': this.imgSize + "px",
                'height': this.imgSize + 55 + "px",
            }
        }
    },
    methods: {
        clicked () {
            this.$emit('clicked');
        }
    }
}
</script>

<style>
.track:hover{
    cursor:grabbing;
}
.artistButton {
    text-transform: none!important;
}
.artistButtonText {
    margin-left: -3px;
    margin-right: 0px;
}
</style>