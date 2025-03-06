<template>
  <div class="row justify-between q-pa-sm q-pl-lg q-pt-lg">
    <div
      v-for="(product, index) in products"
      :key="product.id"
      class="row col-6 col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 q-card q-gutter-md q-mt-md"
    >
      <q-card class="full-width">
        <q-card-section>
          <h3>{{ product.product }}</h3>
          <p>{{ product.description }}</p>
          <p>Preço: {{ product.price | currency }}</p>
          <DefaultCarousel
            :object="{ product: product['@id'] }"
            :configs="carouselConfigs"
            :files="product.productFiles"
          />
        </q-card-section>
        <q-card-section>
          <q-btn
            v-if="product.type === 'custom'"
            :label="$tt('product_orders', 'btn', 'add')"
            color="primary"
            @click="addCustomProduct(product)"
          />
          <div v-else class="row items-center">
            <ProductQuantity
              :product="product"
              @increaseQuantity="increaseQuantity"
              @decreaseQuantity="decreaseQuantity"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="showDialog" full-width>
      <q-card style="min-width: 350px">
        <q-btn
          :label="$tt('product_orders', 'btn', 'close')"
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
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import debounce from "lodash/debounce";
import CustomProduct from "@controleonline/ui-orders/src/components/CustomProduct.vue";
import ProductQuantity from "@controleonline/ui-orders/src/components/ProductQuantity.vue";
import addProduct from "@controleonline/ui-orders/src/components/cart/addProduct";

export default {
  components: {
    CustomProduct,
    ProductQuantity,
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
      products: [],
    };
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      filters: "product_group/filters",
      customProducts: "cart/customProducts",
      product: "cart/product",
      order: "csrt/order",
    }),
    carouselConfigs() {
      return {
        store: "product_file",
        isAdmin: false,
        context: "products",
      };
    },
  },
  created() {
    this.init();
  },
  methods: {
    ...mapActions({
      deleteOrderProducts: "product_orders/remove",
      getProducts: "products/getItems",
      setCustomProducts: "cart/setCustomProducts",
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
    increaseQuantity(product, index) {
      let products = this.$copyObject(this.products);
      products[index] = product;
      this.setCustomProducts(products);
      this.changeCart(index);
    },
    decreaseQuantity(product, index) {
      let products = this.$copyObject(this.products);
      products[index] = product;
      this.setCustomProducts(products);
      this.changeCart(index);
    },

    saved() {
      this.reload();
      this.closeDialog();
    },

    reload() {
      this.$emit("loadData");
      this.$emit("reload");
    },

    changeCart: debounce(function (index) {
      let products = this.$copyObject(this.products);
      let quantity = products[index].quantity || 0;
      if (quantity == 0 && products[index]?.order_products) {
        this.deleteOrderProducts(products[index].order_products);
        this.$emit("deleted", products[index].order_products);
        this.$emit("reload");
        products[index].order_products = null;

        this.setProducts(products);
        return;
      }

      let order_product = {
        id: products[index]?.order_products || null,
        parentProduct: null,
        product: products[index]["@id"],
        product_group_id: null,
        quantity: quantity,
        order: this.order["@id"],
      };

      this.save(order_product).then((result) => {
        products[index].order_products = result["@id"].replace(/\D/g, "");
        this.reload();
      });
    }, 500),

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
