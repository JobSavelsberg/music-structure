<template>
  <v-app>
    <v-main>
      <v-btn @click="authorize">Authorize</v-btn>
      <Chart />
    </v-main>
  </v-app>
</template>

<script>
import Chart from "./components/Chart";
import * as spotify from "./app/spotify";

export default {
  name: "App",

  components: {
    Chart,
  },

  data: () => ({
    //
  }),
  mounted() {},
  methods: {
    authorize() {
      spotify.authorizeUser();
    },
  },
};
</script>
