<template>
  <div>
    <div v-for="(product, index) in products" :key="product.id">
      <q-card>
        <q-card-section>
          <h3>{{ product.product }}</h3>
          <p>{{ product.description }}</p>
          <p>Preço: {{ product.price | currency }}</p>
          <img :src="product.imageUrl" alt="Imagem do Produto" />
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

    <q-dialog v-model="showDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">
            Seleção de Produto: {{ selectedProduct.product }} Total:
            {{ totalPrice }}
          </div>
        </q-card-section>

        <q-card-section>
          <CustomProduct
            :selectedProduct="selectedProduct"
            @changeSelection="changeSelection"
            @changeIngredients="changeIngredients"
          />
        </q-card-section>

        <q-card-actions class="sticky-bottom bg-white">
          <q-btn
            :label="$tt('product_orders', 'btn', 'close')"
            color="primary"
            @click="closeDialog"
          />
          <q-btn
            :label="$tt('product_orders', 'btn', 'add')"
            color="primary"
            @click="addCustomToCart"
          />
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

export default {
  components: {
    CustomProduct,
    ProductQuantity,
  },
  props: {
    configs: {
      required: true,
    },
  },
  data() {
    return {
      selectedIngredients: [],
      products: [],
      showDialog: false,
      totalPrice: 0,
      selectedProduct: null,
      selectedItems: [],
    };
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
    }),
    filters() {
      return this.$copyObject(this.$store.getters["product_group/filters"]);
    },
  },
  created() {
    this.init();
  },
  watch: {},
  methods: {
    ...mapActions({
      deleteOrderProducts: "product_orders/remove",
      saveOrderProducts: "product_orders/save",
      getProducts: "products/getItems",
    }),
    init() {
      this.getProducts({
        type: ["product", "custom"],
        company: "/people/" + this.myCompany.id,
      }).then((response) => {
        this.products = response;
      });
    },
    addCustomProduct(product) {
      this.selectedProduct = product;
      this.showDialog = true;
    },
    increaseQuantity(product, index) {
      let products = this.$copyObject(this.products);
      products[index] = product;
      this.products = products;
      this.changeCart(index);
    },
    decreaseQuantity(product, index) {
      let products = this.$copyObject(this.products);
      products[index] = product;
      this.products = products;
      this.changeCart(index);
    },
    addCustomToCart() {
      let order_products = [];

      this.selectedItems.forEach((group, groupId) => {
        group.forEach((product) => {
          order_products.push({
            productGroup: groupId,
            product: product.productChild["@id"].replace(/\D/g, ""),
            quantity: 1,
          });
        });
      });

      let main_product = {
        parentProduct: null,
        product: this.selectedProduct["@id"],
        quantity: 1,
        order: "/orders/" + this.configs.orderId,
        sub_products: order_products,
      };

      this.save(main_product)
        .then((result) => {})
        .finally(() => {
          this.reload();
          this.closeDialog();
        });
    },
    async save(order_product) {
      return await this.saveOrderProducts(order_product).then((result) => {
        return result;
      });
    },

    reload() {
      this.$emit("loadData");
      this.$emit("reload");
    },
    changeIngredients(selectedIngredients) {
      this.selectedIngredients = selectedIngredients;
      this.calculatePrice();
    },
    changeSelection(selectedItems) {
      this.selectedItems = selectedItems;
      this.calculatePrice();
    },
    calculatePrice() {},
    changeCart: debounce(function (index) {
      let quantity = this.products[index].quantity || 0;
      if (quantity == 0 && this.products[index]?.order_products) {
        this.deleteOrderProducts(this.products[index].order_products);
        this.$emit("deleted", this.products[index].order_products);
        this.$emit("reload");
        this.products[index].order_products = null;
        return;
      }

      let order_product = {
        id: this.products[index]?.order_products || null,
        parentProduct: null,
        product: this.products[index]["@id"],
        product_group_id: null,
        quantity: quantity,
        order: "/orders/" + this.configs.orderId,
      };

      this.save(order_product).then((result) => {
        this.products[index].order_products = result["@id"].replace(/\D/g, "");
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
