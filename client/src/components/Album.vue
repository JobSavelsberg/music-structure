<template>
    <div class="album">
        <v-card>
            <v-img
              :height="album.album.images[imgSize].height"
              :width="album.album.images[imgSize].width"
              :src="album.album.images[imgSize].url"
            ></v-img>
            <v-card-title> {{ album.name }} </v-card-title>
        </v-card>
    </div>
</template>

<script>
export default {
    props: [
        'album',
        'imgSize',
    ],
    data () {
        return {

        }
    },
    mounted () {
        console.log(this.album);
    }
}
</script>

<style>
</style>