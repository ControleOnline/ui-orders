<template>
  <q-btn
    flat
    dense
    :disabled="product.quantity == 0 || isSaving"
    :icon="
      product.quantity == 1 ? 'delete' : product.quantity == 0 ? '' : 'remove'
    "
    color="red"
    @click="decreaseQuantity()"
  />
  <span class="q-mx-md">{{ product.quantity || defaultQuantity }}</span>
  <q-btn
    :disabled="isSaving"
    flat
    dense
    icon="add"
    color="red"
    @click="increaseQuantity()"
  />
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
      order: "cart/order",
      isSaving: "order_products/isSaving",
    }),
  },
  data() {
    return {};
  },
  created() {
    this.checkQuantity();
  },
  watch: {
    order: {
      handler() {
        this.checkQuantity();
      },
      deep: true,
    },
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
      this.changeQuantity(product, true);
    },
    decreaseQuantity() {
      let product = this.$copyObject(this.product);
      if (product.quantity && product.quantity >= 1) product.quantity--;
      this.changeQuantity(product, true);
    },
    changeQuantity(product, emit = false) {
      let products = this.$copyObject(this.products);
      let index = this.getIndex(product);

      products[index] = product;
      this.setProducts(products);
      this.setProduct(product);
      if (emit) this.$emit("changeQuantity", product);
    },
    getIndex(row) {
      if (!row) return -1;
      return this.products.findIndex((item) => item["@id"] == row["@id"]);
    },
    checkQuantity() {
      if (this.product.type != "product") return;

      let product = this.$copyObject(this.product);

      this.order?.orderProducts?.forEach((p, i) => {
        if (p.product.type == "product")
          if (p.product["@id"] == product["@id"]) {
            product.quantity = p.quantity;
            product.order_products = p.id;
            this.changeQuantity(product);
          }
      });
    },
  },
};
</script>
