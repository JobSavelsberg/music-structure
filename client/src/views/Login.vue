<template>
    <div class="login">
        <v-container fill-height>
            <v-layout align-center>
                <v-card class="mx-auto elevation-15">
                    <v-card-title class="justify-center">Music Structure Visualizer</v-card-title>
                    <v-card-subtitle class="text-center">
                        Visualize the structure of music in your own library!
                    </v-card-subtitle>
                    <v-card-text class="text-center">
                        Logging in with spotify enables the app to play music using your spotify account.
                    </v-card-text>
                    <v-card-actions>
                        <v-btn class="mx-auto" color="success" @click="spotifyAuthorize">Log in with Spotify</v-btn>
                    </v-card-actions>
                </v-card>
            </v-layout>
        </v-container>
    </div>
</template>

<script>

export default {
  name: 'Login',
  components: {
  },
  methods: {
      spotifyAuthorize () {
          window.location.href="http://localhost:5000/api/spotify/login"
      }
  }
}
</script>

<style>
.login{
    height: 100%
}
</style>
