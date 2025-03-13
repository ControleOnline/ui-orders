<template>
  <div
    @click="clickProduct(product)"
    class="q-card q-hoverable product-card q-card col-6 col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-3 q-gutter-md q-mt-md"
  >
    <DefaultCarousel
      v-if="product.productFiles"
      :row="{ product: product['@id'] }"
      :configs="carouselConfigs"
      :files="product.productFiles"
    />
    <div class="badge sale btn-primary">ON SALE</div>
    <div class="q-pa-sm text-center">
      <div class="row q-pa-sm col-12">
        <div class="row col-8 text-left column">
          <div class="text-subtitle1 text-weight-bolder">
            {{ product.product }}
          </div>
        </div>
        <div class="col-4 text-right column">
          <div class="text-subtitle1 text-blue-8">
            {{ $formatter.formatMoney(product.price, "R$", "pt-br") }}
          </div>
        </div>
        <div
          class="icon-container row col-12 justify-center full-width q-pt-md"
        >
          <q-btn
            flat
            round
            icon="shopping_cart"
            class="full-width icon-box icon-box-hover"
            :label="$tt('cart', 'btn', 'Customize')"
            v-if="product.type === 'custom'"
            @click="showDetails(product)"
          />
          <div v-else class="row items-center justify-center full-width">
            <div class="icon-box full-width" :style="{ borderRadius: '5px' }">
              <ProductQuantity
                :product="product"
                @changeQuantity="changeQuantity"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ProductQuantity from "@controleonline/ui-orders/src/vue/components/cart/ProductQuantity.vue";
import debounce from "lodash/debounce";

export default {
  components: {
    ProductQuantity,
  },
  data() {
    return {};
  },

  props: {
    product: {
      required: true,
    },
  },
  computed: {
    ...mapGetters({
      customProducts: "cart/customProducts",
      products: "products/items",
      order: "cart/order",
    }),
    carouselConfigs() {
      return {
        store: "product_file",
        isAdmin: false,
        context: "products",
      };
    },
  },
  created() {},

  methods: {
    ...mapActions({
      deleteOrderProducts: "order_products/remove",
      saveOrderProducts: "order_products/save",
      setProducts: "products/setItems",
      setReload: "cart/setReload",
    }),
    showDetails(product) {
      this.$emit("showDetails", product);
    },
    clickProduct(product) {
      //this.$emit("clickProduct", product);
    },
    changeCart: debounce(function (index) {
      let products = this.$copyObject(this.products);

      let quantity = products[index].quantity || 0;
      if (quantity == 0 && products[index]?.order_products) {
        this.deleteOrderProducts(products[index].order_products)
          .then(() => {
            this.$emit("deleted", products[index].order_products);
            products[index].order_products = null;
            this.setProducts(products);
          })
          .finally(() => {
            this.reload();
          });

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

      this.save(order_product)
        .then((result) => {
          products[index].order_products = result["@id"].replace(/\D/g, "");
          this.setProducts(products);
        })
        .finally(() => {
          this.reload();
        });
    }, 500),
    getIndex(row) {
      if (!row) return -1;
      return this.products.findIndex((item) => item["@id"] == row["@id"]);
    },
    changeQuantity(product) {
      let index = this.getIndex(product);
      this.changeCart(index);
    },
    saved() {
      this.$emit("saved");
    },
    reload() {
      this.setReload(true);
      this.$emit("reload");
    },
    async save(order_product) {
      return await this.saveOrderProducts(order_product).then((result) => {
        return result;
      });
    },
  },
};
</script>

<style>
.badge.sale {
  position: absolute;
  top: 16px;
  right: 16px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  padding: 4px 8px;
}

.icon-container {
  /*position: absolute;*/
  bottom: 15px;
  left: 50%;

  display: flex;
  justify-content: space-between;
  background: transparent;
}

.icon-box {
  width: 20%;
  height: 55px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--primary);
  background-color: #ffffff;
  color: var(--primary);
}

.q-btn {
  border-radius: 5px;
}

.text-subtitle1 {
  font-size: 14px;
  color: #000000;
  font-weight: 600;
  text-decoration: none;
}

.text-subtitle1 a {
  font-size: 14px;
  color: #000000;
  font-weight: 600;
  text-decoration: none;
}

.product-card {
  transition: box-shadow 0.3s ease;
}
.product-card:hover,
.icon-box-hover:hover {
  box-shadow: 0 4px 8px rgb(0 0 0 / 53%);
}
.icon-box-hover:hover {
  background-color: var(--primary) !important;
  color: var(--text-primary) !important;
}
</style>
