<template>
  <div>
    <!-- Lista de Produtos -->
    <div v-for="product in products" :key="product.id">
      <q-card
        @click="
          selectedProduct = product;
          openDialog();
        "
      >
        <q-card-section>
          <h3>{{ product.product }}</h3>
          <p>{{ product.description }}</p>
          <p>Preço: {{ product.price | currency }}</p>
          <img :src="product.imageUrl" alt="Imagem do Produto" />
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
              Escolha entre {{ group.minimum }} e {{ group.maximum }} sabores
            </p>
            <q-option-group
              v-model="selectedItems[group.id]"
              type="checkbox"
              :options="
                getProductOptions(group).map((option) => ({
                  ...option,
                  disable: isMaxSelected(group, option.value), // Desabilita apenas os que não estão selecionados
                }))
              "
              multiple
              emit-value
              map-options
            />
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
            @click="addToCart"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  props: {
    configs: {
      required: true,
    },
  },
  data() {
    return {
      products: [],
      showDialog: false,
      totalPrice: 0,
      groups: [],
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
  watch: {
    selectedItems: {
      handler() {
        this.calculatePrice();
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions({
      getProducts: "products/getItems",
      getProductGroups: "product_group/getItems",
      getProductGroupProducts: "product_group_product/getItems",
    }),
    init() {
      this.getProducts({
        type: "product",
        company: "/people/" + this.myCompany.id,
      }).then((response) => {
        this.products = response;
      });
    },
    addToCart() {
      console.log(this.selectedItems);
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
        label: `${product.productChild.product} - ${product.productChild.price}`,
        value: product,
      }));
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
