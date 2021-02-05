<template>
  <div class="callback"></div>
</template>

<script>
import { requestFirstToken } from "../app/authentication";

export default {
  name: "Callback",
  components: {},
  beforeCreate() {
    let params = new URLSearchParams(window.location.search);
    let code = params.get("code");
    requestFirstToken(code).then(() => {
      this.$router.push("/home/-1");
    });
  },
};
</script>

<style>
.callback {
  height: 100%;
}
</style>