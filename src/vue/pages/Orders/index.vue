<template>
  <Orders :context="context" v-if="context" />
</template>

<script>
import Orders from "../../components/Orders.vue";

export default {
  components: {
    Orders,
  },

  data() {
    return {
      context: 'sales'
    };
  },
  created() {
  },
};
</script>
