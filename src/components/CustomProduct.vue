<template>
  <div class="row justify-between q-pa-sm q-pl-lg q-pt-lg">
    <div
      v-for="group in groups"
      :key="group.id"
      class="row col-6 col-xs-12 col-sm-12 col-md-12 col-lg-6 col-xl-6 q-card q-gutter-md q-mt-md"
    >
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
                    isMaxSelectedForGroup(opt.value.productGroup, opt.value)
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
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
export default {
  components: {},
  props: {
    selectedProduct: {
      required: true,
    },
  },
  data() {
    return {
      selectedIngredients: [],
      selectedItems: [],
      showCustom: [],
      groups: [],
      isUpdating: false,
    };
  },
  computed: {
    ...mapGetters({
      filters: "product_group/filters",
    }),
  },
  created() {
    this.init();
  },
  watch: {
    selectedIngredients: {
      handler() {
        this.$emit("changeIngredients", this.selectedIngredients);
      },
      deep: true,
    },

    selectedItems: {
      handler() {
        this.$emit("changeSelection", this.selectedItems);
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions({
      getProductGroups: "product_group/getItems",
      getProductGroupProducts: "product_group_product/getItems",
    }),
    init() {
      let filters = this.$copyObject(this.filters);
      filters.product = this.selectedProduct.id;

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
      });
    },

    isMaxSelectedForGroup(groupId, product) {
      const groupIndex = this.findGroupIndex(groupId);
      if (groupIndex === -1) return false;
      return this.isMaxSelected(this.groups[groupIndex], product);
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
    fetchProductGroupProducts(group) {
      let filters = {};
      filters.productGroup = "/product_groups/" + group.id;
      filters.productType = "component";
      return this.getProductGroupProducts(filters);
    },
    handleRemoveIngredient(ingredient, product) {
      console.log(ingredient, product);
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
