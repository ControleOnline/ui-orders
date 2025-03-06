<template>
  <q-btn flat dense icon="remove" color="grey" @click="decreaseQuantity()" />
  <span class="q-mx-md">{{ product.quantity || defaultQuantity }}</span>
  <q-btn flat dense icon="add" color="red" @click="increaseQuantity()" />
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import debounce from "lodash/debounce";

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
  computed: {
    ...mapGetters({
      products: "products/items",
    }),
  },
  data() {
    return {};
  },
  methods: {
    ...mapActions({
      setCustomProducts: "cart/setCustomProducts",
      setProducts: "products/setItems",
      setProduct: "cart/setProduct",
    }),
    increaseQuantity() {
      let product = this.$copyObject(this.product);
      product.quantity = (product.quantity || this.defaultQuantity) + 1;
      this.changeQuantity(product);
    },
    decreaseQuantity() {
      let product = this.$copyObject(this.product);
      if (product.quantity && product.quantity >= 1) product.quantity--;
      this.changeQuantity(product);
    },
    changeQuantity(product) {
      let products = this.$copyObject(this.products);
      let index = this.getIndex(product);

      products[index] = product;
      //this.setCustomProducts(products);
      this.setProducts(products);
      this.setProduct(product);
      this.$emit("changeQuantity", product);
     
    },
    getIndex(row) {
      if (!row) return -1;
      return this.products.findIndex((item) => item["@id"] == row["@id"]);
    },
  },
};
</script>
