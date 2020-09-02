<template>
    <div>
        <v-slide-group
            v-model="selected"
            center-active
            class="pt-2"
            v-on:scroll.native="onScroll"
            mandatory
            @change="sendValue"
        >

        <v-slide-item
            v-for="(track, index) in tracks"
            :key="index"
            v-slot:default="{ active, toggle }"
            class="mx-2 my-1"
        >
            <Album :album="track" :imgSize="active ? albumSize*1.5 : albumSize" :active="active" @clicked="toggle"/>
        </v-slide-item>
        </v-slide-group>
    </div>
</template>

<script>
import Album from "../components/Album"

export default {
  name: 'TrackSelector',
  props: [
      'value',
      'tracks',
      'albumSize'
  ],
  components: {
      Album
  },
  data: () => ({
      selected: 0
  }),
  mounted () {
      this.selected = this.value;
  },
  methods: {
      sendValue () {
          console.log(this.selected);
          this.$emit('input', this.selected);
      }
  }
};
</script>