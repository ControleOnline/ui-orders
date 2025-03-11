<template>
  <div class="row col-12 product-add">
    <div class="col flex items-center justify-center">
      <ProductQuantity :defaultQuantity="1" :product="product" />
    </div>
    <div class="col flex items-center justify-center">
      <q-btn
        :label="$tt('order_products', 'btn', 'add')"
        class="full-width q-pa-xs btn-primary"
        @click="addCustomToCart"
      />
    </div>
  </div>
</template>
<script>
import ProductQuantity from "@controleonline/ui-orders/src/vue/components/cart/ProductQuantity.vue";
import { mapActions, mapGetters } from "vuex";

export default {
  components: {
    ProductQuantity,
  },
  computed: {
    ...mapGetters({
      customProducts: "cart/customProducts",
      product: "cart/product",
      order: "cart/order",
    }),
  },
  created() {},
  methods: {
    ...mapActions({
      saveOrderProducts: "order_products/save",
      setReload: "cart/setReload",
    }),
    addCustomToCart() {
      let order_products = [];

      this.customProducts.forEach((group, groupId) => {
        group.forEach((product) => {
          order_products.push({
            productGroup: groupId,
            product: product.productChild["@id"].replace(/\D/g, ""),
            quantity: product.productChild.quantity || 0,
          });
        });
      });

      let main_product = {
        parentProduct: null,
        product: this.product["@id"],
        quantity: this.product.quantity || 0,
        order: this.order["@id"],
        sub_products: order_products,
      };

      this.save(main_product).then((result) => {
        this.$emit("saved", result);
        this.setReload(true);
      });
    },
    async save(order_product) {
      return await this.saveOrderProducts(order_product).then((result) => {
        return result;
      });
    },
  },
};
</script>
