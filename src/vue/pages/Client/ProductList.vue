<template>
  <div class="row col-12 justify-between q-pa-sm q-pl-lg q-pt-lg">
    <template
      v-for="product in products"
      :key="product.id"
      @click="clickProduct(product)"
    >
      <productCard
        :product="product"
        @showDetails="addCustomProduct"
        @saved="saved"
        @reload="reload"
      />
    </template>
  </div>

  <q-dialog v-model="showDialog" full-width>
    <q-card style="min-width: 350px">
      <q-btn
        :label="$tt('order_products', 'btn', 'close')"
        color="primary"
        @click="closeDialog"
      />
      <q-card-section>
        <div class="text-h6">
          Seleção de Produto: {{ product.product }} Total:
          {{ totalPrice }}
        </div>
      </q-card-section>

      <q-card-section>
        <CustomProduct />
      </q-card-section>

      <q-card-actions class="sticky-bottom bg-white">
        <addProduct @saved="saved" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import CustomProduct from "@controleonline/ui-orders/src/vue/components/CustomProduct.vue";
import addProduct from "@controleonline/ui-orders/src/vue/components/cart/addProduct";
import productCard from "@controleonline/ui-orders/src/vue/components/cart/productCard";

export default {
  components: {
    CustomProduct,
    productCard,
    addProduct,
  },
  props: {
    configs: {
      required: true,
    },
  },
  data() {
    return {
      showDialog: false,
      totalPrice: 0,
    };
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      filters: "product_group/filters",
      customProducts: "cart/customProducts",
      product: "cart/product",
      products: "products/items",
    }),
  },
  created() {
    this.init();
  },
  methods: {
    ...mapActions({
      getProducts: "products/getItems",
      setProduct: "cart/setProduct",
    }),
    init() {
      this.getProducts({
        type: ["product", "custom"],
        company: "/people/" + this.myCompany.id,
      });
    },
    addCustomProduct(product) {
      this.setProduct(product);
      this.showDialog = true;
    },

    saved() {
      this.reload();
      this.closeDialog();
    },

    reload() {
      this.$emit("loadData");
      this.$emit("reload");
    },

    closeDialog() {
      this.showDialog = false;
    },
  },
};
</script>

<style scoped>
/* Customização opcional de estilos */
.q-card {
  margin-bottom: 20px;
}

.q-card-section {
  padding: 10px;
}

img {
  max-width: 100%;
  height: auto;
}
</style>
