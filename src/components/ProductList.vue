<template>
  <div>
    <!-- Lista de Produtos -->
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
            <q-btn
              flat
              dense
              icon="remove"
              color="grey"
              @click="decreaseQuantity(product, index)"
            />
            <span class="q-mx-md">{{ product.quantity || 0 }}</span>
            <q-btn
              flat
              dense
              icon="add"
              color="red"
              @click="increaseQuantity(product, index)"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Diálogo de Seleção do Produto -->
    <q-dialog v-model="showDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">
            Seleção de Produto: {{ selectedProduct.product }} Total:
            {{ totalPrice }}
          </div>
        </q-card-section>

        <q-card-section>
          <div v-for="group in groups" :key="group.id">
            <h2>{{ group.productGroup }}</h2>
            <p v-if="group.required">Grupo obrigatório!</p>
            <p v-if="group.minimum && group.maximum">
              Escolha entre {{ group.minimum }} e {{ group.maximum }}
              {{ group.productGroup }}
            </p>
            <p v-if="!group.minimum && group.maximum">
              Escolha até {{ group.maximum }} {{ group.productGroup }}
            </p>
            <q-option-group
              v-model="selectedItems[group.id]"
              type="checkbox"
              :options="getProcessedOptions(group)"
              multiple
              emit-value
              map-options
            >
              <template v-slot:label="opt" class="full-width">
                <div class="row items-center">
                  <span>{{ opt.label }}</span>
                  <q-btn
                    v-if="isSelected(group.id, opt.value)"
                    @click="handleShowCustom(opt, $event)"
                    class="q-ml-sm"
                    icon="settings"
                    flat
                    :disable="
                      isMaxSelectedForGroup(opt.value.productGroup, opt.value)
                    "
                  >
                    <q-tooltip>Customizar</q-tooltip>
                  </q-btn>
                  <q-dialog v-model="showCustom[opt.value.id]">
                    <q-card style="min-width: 350px">
                      <q-card-section>
                        {{ opt.removeble }}
                      </q-card-section>
                      <q-card-section> </q-card-section>
                      <q-chip
                        v-for="ingredient in opt.value.productChild.ingredients"
                        removable
                        v-model="selectedIngredients[group.id]"
                        @remove="removeIngredient(opt, ingredient)"
                        color="teal"
                        text-color="white"
                        icon="cake"
                        :label="ingredient"
                        :disable="
                          isMaxSelectedForGroup(
                            opt.value.productGroup,
                            opt.value
                          )
                        "
                      >
                        <q-tooltip>{{ chocolateLabel }}</q-tooltip>
                      </q-chip>
                    </q-card>
                  </q-dialog>
                </div>
              </template>
            </q-option-group>
          </div>
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

export default {
  props: {
    configs: {
      required: true,
    },
  },
  data() {
    return {
      showCustom: [],
      selectedIngredients: [],
      products: [],
      showDialog: false,
      totalPrice: 0,
      groups: [],
      selectedProduct: null,
      selectedItems: [],
      isUpdating: false,
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
  watch: {
    selectedIngredients: {
      handler() {
        this.calculatePrice();
      },
      deep: true,
    },

    selectedItems: {
      handler() {
        this.calculatePrice();
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions({
      deleteOrderProducts: "product_orders/remove",
      saveOrderProducts: "product_orders/save",
      getProducts: "products/getItems",
      getProductGroups: "product_group/getItems",
      getProductGroupProducts: "product_group_product/getItems",
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
      this.openDialog();
    },
    increaseQuantity(product, index) {
      let cproduct = this.$copyObject(product);
      let products = this.$copyObject(this.products);

      cproduct.quantity = (cproduct.quantity || 0) + 1;
      products[index] = cproduct;
      this.products = products;
      this.changeCart(index);
    },
    decreaseQuantity(product, index) {
      let cproduct = this.$copyObject(product);
      let products = this.$copyObject(this.products);

      if (cproduct.quantity && cproduct.quantity >= 1) cproduct.quantity--;

      products[index] = cproduct;
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

    handleRemoveIngredient(ingredient, product) {
      console.log(ingredient, product);
    },

    fetchProductGroupProducts(group) {
      let filters = {};
      filters.productGroup = "/product_groups/" + group.id;
      filters.company = "/people/" + this.myCompany.id;
      filters.productType = "component";
      return this.getProductGroupProducts(filters);
    },

    openDialog() {
      let filters = this.$copyObject(this.filters);
      filters.product = this.selectedProduct.id;
      filters.company = "/people/" + this.myCompany.id;
      filters["product.productType"] = "component";
      this.$store.commit("product_group/SET_FILTERS", filters);
      this.getProductGroups(filters).then((response) => {
        let groups = this.$copyObject(response);
        groups.forEach((group) => {
          this.fetchProductGroupProducts(group).then((response) => {
            this.selectedItems[group.id] = [];
            this.selectedIngredients[group.id] = [];
            group.products = response.map((product) => ({
              ...product,
              selected: false,
            }));
          });
        });
        this.groups = groups;
        this.showDialog = true;
      });
    },
    closeDialog() {
      this.showDialog = false;
    },
    calculatePrice() {},
    getProductOptions(group) {
      if (!Array.isArray(group.products)) {
        return []; // Retorna um array vazio caso products não seja válido
      }
      return group.products.map((product) => ({
        label: `${product.productChild.product} - ${product.price}`,
        value: product,
        ingredients: [],
        removeble: [],
      }));
    },
    getProcessedOptions(group) {
      return this.getProductOptions(group).map((option) => ({
        ...option,
        disable: this.isMaxSelected(group, option.value),
      }));
    },

    isSelected(groupId, value) {
      return (
        this.selectedItems[groupId] &&
        this.selectedItems[groupId].includes(value)
      );
    },

    isMaxSelectedForGroup(groupId, product) {
      const groupIndex = this.findGroupIndex(groupId);
      if (groupIndex === -1) return false;
      return this.isMaxSelected(this.groups[groupIndex], product);
    },

    removeIngredient(opt, ingredient) {
      opt.removeble.push(ingredient);
      this.handleRemoveIngredient(ingredient, opt);
    },
    handleShowCustom(opt, $event) {
      $event.stopPropagation();

      this.getProductGroupProducts({
        product: opt.value.productChild["@id"],
        productGroup: opt.value.productGroup,
        productType: "feedstock",
      })
        .then((result) => {
          const groupIndex = this.findGroupIndex(opt.value.productGroup);
          if (groupIndex === -1) return;

          const productIndex = this.findProductIndex(
            this.groups[groupIndex],
            opt.value["@id"]
          );
          if (productIndex === -1) return;

          this.updateProductIngredients(groupIndex, productIndex, result);
        })
        .finally(() => {
          this.showCustom[opt.value.id] = true;
        });
    },

    findGroupIndex(productGroupId) {
      return this.groups.findIndex((group) => group["@id"] === productGroupId);
    },

    findProductIndex(group, productId) {
      return group.products.findIndex(
        (product) => product["@id"] === productId
      );
    },
    updateProductIngredients(groupIndex, productIndex, ingredients) {
      this.groups[groupIndex].products[productIndex].productChild.ingredients =
        ingredients;
    },
    isMaxSelected(group, product) {
      if (!group.maximum) return false;
      const selectedGroup = this.selectedItems[group.id] || [];
      return (
        selectedGroup.length >= group.maximum &&
        !selectedGroup.map((p) => p.id).includes(product.id)
      );
    },
    isProductSelected(groupId, product) {
      const selectedGroup = this.selectedItems[groupId] || [];
      return !selectedGroup.includes(product.id);
    },
    getGroupLimits(groupId) {
      const group = this.groups.find((g) => g.id === groupId);
      return { minimum: group.minimum, maximum: group.maximum };
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
