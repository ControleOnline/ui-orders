<template>
  <TableCategories  :context="context" v-if="context"/>
</template>

<script>
import TableCategories from "@controleonline/ui-common/src/components/Categories/Table.vue";

export default {
  components: {
    TableCategories,
  },

  data() {
    return {
      context:'receive'
    };
  },
  created() { },
};
</script>
