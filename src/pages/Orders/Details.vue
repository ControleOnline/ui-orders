<template>
  <Orders :context="context" v-if="context" :orderId="orderId" />
</template>

<script>
import Orders from "@controleonline/ui-orders/src/components/Details.vue";

export default {
  components: {
    Orders,
  },

  data() {
    return {
      context: "sales",
      orderId: null,
    };
  },
  created() {
    this.orderId = decodeURIComponent(this.$route.params.id);
  },
};
</script>
