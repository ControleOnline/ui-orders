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
        class="custom-box full-width"
      >
        <template v-slot:label="opt">
          <div class="row items-center full-width q-pa-md">
            <div class="row col-4">
              <span>{{ opt.label }}</span>
            </div>

            <div class="row col-3 items-center justify-center">
              <q-btn
                v-if="isSelected(group.id, opt.value)"
                @click="handleShowCustom(opt, $event)"
                class="col q-ml-sm"
                icon="add"
                flat
                :disable="
                  isMaxSelectedForGroup(opt.value.productGroup, opt.value)
                "
              >
                <q-tooltip>Adicionar Ingredientes</q-tooltip>
              </q-btn>

              <q-btn
                v-if="isSelected(group.id, opt.value)"
                @click="handleShowCustom(opt, $event)"
                class="col q-ml-sm"
                icon="remove"
                flat
                :disable="
                  isMaxSelectedForGroup(opt.value.productGroup, opt.value)
                "
              >
                <q-tooltip>Remover Ingredientes</q-tooltip>
              </q-btn>
            </div>
            <div class="row col-3 items-center justify-end">
              {{
                "R$ " + $formatter.formatMoney(opt.value.price, "BRL", "pt-br")
              }}
            </div>
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
      product: "cart/product",
      customProducts: "cart/customProducts",
    }),
  },
  created() {
    this.init();
  },
  watch: {
    product: {
      handler() {
        if (this.groups.length) return;
        this.init();
      },
      deep: true,
    },
    selectedIngredients: {
      handler() {
        //this.$emit("changeIngredients", this.selectedIngredients);
      },
      deep: true,
    },
    selectedItems: {
      handler() {
        this.setCustomProducts(this.$copyObject(this.selectedItems));
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions({
      getProductGroups: "product_group/getItems",
      getProductGroupProducts: "product_group_product/getItems",
      setFilters: "product_group/setFilters",
      setCustomProducts: "cart/setCustomProducts",
    }),
    init() {
      if (!this.product || !this.product["@id"]) return;

      let filters = this.$copyObject(this.filters);
      filters.product = this.product.id;

      filters["product.productType"] = "component";
      this.setFilters(filters);

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
      // Obtém todas as opções de produtos
      let options = this.getProductOptions(group);

      // Verifica se o número máximo foi atingido
      const selectedCount = this.selectedItems[group.id]?.length || 0;
      const isMaxReached = group.maximum && selectedCount >= group.maximum;

      // Se o máximo foi atingido, filtra apenas os produtos selecionados
      if (isMaxReached) {
        options = options.filter((option) =>
          this.isSelected(group.id, option.value)
        );
      }

      // Retorna as opções processadas com a propriedade disable
      return options.map((option) => ({
        ...option,
        disable: this.isMaxSelected(group, option.value),
      }));
    },

    isSelected(groupId, value) {
      return (
        this.selectedItems[groupId] &&
        this.selectedItems[groupId].some((item) => item["@id"] === value["@id"])
      );
    },

    getProductOptions(group) {
      if (!Array.isArray(group.products)) {
        return [];
      }
      return group.products.map((product) => ({
        label: product.productChild.product,
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
        !selectedGroup.some((p) => p["@id"] === product["@id"])
      );
    },

    isProductSelected(groupId, product) {
      const selectedGroup = this.selectedItems[groupId] || [];
      return !selectedGroup.some((p) => p["@id"] === product["@id"]);
    },

    getGroupLimits(groupId) {
      const group = this.groups.find((g) => g.id === groupId);
      return { minimum: group.minimum, maximum: group.maximum };
    },
  },
};
</script>

<style>
.custom-box .q-checkbox__label,
.custom-box .q-checkbox {
  width: 100%;
}
.custom-box > div:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.03);
}
</style>
