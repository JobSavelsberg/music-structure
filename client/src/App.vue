<template>
  <v-app id="app" :dark="true">
      <router-view/>
  </v-app>
</template>

<script>
export default {
  name: 'App',

  components: {
  },

  data: () => ({
    //
  }),
   mounted: function() {
    let elHtml = document.getElementsByTagName('html')[0]
    elHtml.style.overflowY = 'auto'
  },
  destroyed: function() {
    let elHtml = document.getElementsByTagName('html')[0]
    elHtml.style.overflowY = null
  },
};
</script>
