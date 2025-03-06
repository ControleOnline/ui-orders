<template>
  <q-btn
    flat
    dense
    icon="remove"
    color="grey"
    @click="decreaseQuantity(cproduct, index)"
  />
  <span class="q-mx-md">{{ cproduct.quantity || 1 }}</span>
  <q-btn
    flat
    dense
    icon="add"
    color="red"
    @click="increaseQuantity(cproduct, index)"
  />
</template>

<script>
export default {
  components: {},
  props: {
    product: {
      required: true,
    },
  },
  data() {
    return {
      cproduct: {},
    };
  },
  computed: {},
  created() {
    this.cproduct = this.$copyObject(this.product);
  },
  watch: {},
  methods: {
    increaseQuantity(cproduct, index) {
      cproduct.quantity = (cproduct.quantity || 1) + 1;

      this.$emit("increaseQuantity", cproduct, index);
    },
    decreaseQuantity(cproduct, index) {
      if (cproduct.quantity && cproduct.quantity >= 1) cproduct.quantity--;
      this.$emit("decreaseQuantity", cproduct, index);
    },
  },
};
</script>
