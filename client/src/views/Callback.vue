<template>
  <div class="callback">
  </div>
</template>

<script>
import { requestFirstToken } from "../app/app"

export default {
  name: 'Callback',
  components: {
  },
  beforeCreate () {
      let params = new URLSearchParams(window.location.search);
      let code = params.get('code')
      requestFirstToken(code).then(()=>{
        this.$router.push('/home');
      })
  }
}
</script>

<style>
.callback{
  height: 100%,
}
</style>