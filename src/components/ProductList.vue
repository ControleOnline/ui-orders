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
          </q-card-section>
        </q-card>
      </div>
  
      <!-- Diálogo de Seleção do Produto -->
      <q-dialog v-model="showDialog">
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">
              Seleção de Produto: {{ selectedProduct.product }}
            </div>
          </q-card-section>
  
          <q-card-section>
            <div v-for="group in groups" :key="group.id">
              <h2>{{ group.productGroup }}</h2>
              <p v-if="group.required">Grupo obrigatório!</p>
              <p v-if="group.minimum || group.maximum">
                Escolha entre {{ group.minimum }} e {{ group.maximum }} sabores
              </p>
              <div v-for="product in group.products" :key="product.id">
                <q-item @click="toggleSelection(product, group)">
                  <q-item-section>
                    <p>
                      {{ product.productChild.product }} - 
                      {{ product.productChild.price | currency }}
                    </p>
                    <p>{{ product.productChild.description }}</p>
                  </q-item-section>
                </q-item>
              </div>
            </div>
          </q-card-section>
  
          <q-card-actions>
            <q-btn label="Fechar" color="primary" @click="closeDialog" />
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
        groups: [],
        selectedProduct: null,
        selectedItems: {},
        productGroup: [], 
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
              group.products = response;
            });
          });
          this.groups = groups;
          this.showDialog = true;
        });
      },
  
      closeDialog() {
        this.showDialog = false;
      },
  
      toggleSelection(product, group) {
        if (!this.selectedItems[group.id]) {
          this.selectedItems[group.id] = [];
        }
        const selected = this.selectedItems[group.id];
        const productIndex = selected.findIndex(item => item.id === product.id);
  
        // Lógica para garantir que o número mínimo e máximo de produtos sejam respeitados
        if (productIndex > -1) {
          selected.splice(productIndex, 1); // Remover item selecionado
        } else {
          if (selected.length < group.maximum) {
            selected.push(product); // Adicionar novo item
          }
        }
      },
  
      calculateTotalPrice(group) {
        const selectedProducts = this.selectedItems[group.id] || [];
        let totalPrice = 0;
  
        if (group.priceCalculation === "biggest") {
          // Maior preço entre os selecionados
          totalPrice = Math.max(...selectedProducts.map(p => p.productChild.price), 0);
        } else if (group.priceCalculation === "average") {
          // Média dos preços selecionados
          const sum = selectedProducts.reduce((sum, p) => sum + p.productChild.price, 0);
          totalPrice = sum / selectedProducts.length;
        } else if (group.priceCalculation === "sum") {
          // Soma dos preços (para refrigerantes, por exemplo)
          totalPrice = selectedProducts.reduce((sum, p) => sum + p.productChild.price, 0);
        }
  
        return totalPrice;
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
  </style>
  