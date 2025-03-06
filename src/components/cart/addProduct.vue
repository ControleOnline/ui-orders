<template>
  <div class="row col-12 product-add">
    <div class="col flex items-center justify-center">
      <ProductQuantity
        :product="product"
        @increaseQuantity="increaseQuantity"
        @decreaseQuantity="decreaseQuantity"
      />
    </div>
    <div class="col flex items-center justify-center">
      <q-btn
        class="full-width q-pa-xs btn-primary"
        label="Adicionar ao Carrinho"
      />
    </div>
  </div>
</template>
<script>
import { mapActions, mapGetters } from "vuex";
import ProductQuantity from "@controleonline/ui-orders/src/components/ProductQuantity.vue";
export default {
  components: {
    ProductQuantity,
  },
  computed: {
    ...mapGetters({
      product: "products/item",
    }),
  },
  created() {},
  watch: {
    product: {
      handler() {
        console.log(this.product);
      },
      deep: true,
    },
  },
};
</script>
