<template>
  <q-btn flat dense icon="remove" color="grey" @click="decreaseQuantity()" />
  <span class="q-mx-md">{{ product.quantity || defaultQuantity }}</span>
  <q-btn flat dense icon="add" color="red" @click="increaseQuantity()" />
</template>

<script>
export default {
  components: {},
  props: {
    product: {
      required: true,
    },
    defaultQuantity: {
      default: 0,
    },
  },
  data() {
    return {};
  },
  methods: {
    increaseQuantity() {
      let product = this.$copyObject(this.product);
      product.quantity = (product.quantity || this.defaultQuantity) + 1;
      this.$emit("increaseQuantity", product);
    },
    decreaseQuantity() {
      let product = this.$copyObject(this.product);
      if (product.quantity && product.quantity >= 1) product.quantity--;
      this.$emit("decreaseQuantity", product);
    },
  },
};
</script>
