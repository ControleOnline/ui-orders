<template>
  <q-card class="q-pa-lg full-width">
    <q-card-section>
      <h6>Ingretientes Mantidos</h6>
      <div class="row col-12">
        <q-chip
          v-for="ingredient in activeIngredients"
          :key="ingredient['@id']"
          removable
          @remove="removeIngredient(ingredient)"
          color="teal"
          text-color="white"
          icon-remove="remove"
          :label="ingredient.productChild.product"
        >
          <q-tooltip>Remover {{ ingredient.productChild.product }}</q-tooltip>
        </q-chip>
      </div>
    </q-card-section>
    <q-card-section>
      <h6>Ingretientes Removidos</h6>
      <div class="row col-12">
        <q-chip
          v-for="ingredient in removedIngredients"
          :key="ingredient['@id']"
          removable
          @remove="addIngredient(ingredient)"
          color="red"
          text-color="white"
          icon-remove="add"
          :label="ingredient.productChild.product"
        >
          <q-tooltip>{{ ingredient.productChild.product }} removida</q-tooltip>
        </q-chip>
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
export default {
  props: {
    product: { required: true },
  },
  data() {
    return {
      activeIngredients: [],
      removedIngredients: [],
    };
  },
  created() {
    this.activeIngredients = [...this.product.ingredients];
  },
  methods: {
    addIngredient(ingredient) {
      const index = this.removedIngredients.findIndex(
        (i) => i["@id"] === ingredient["@id"]
      );
      if (index !== -1) this.removedIngredients.splice(index, 1);

      this.activeIngredients.push(ingredient);
    },
    removeIngredient(ingredient) {
      const index = this.activeIngredients.findIndex(
        (i) => i["@id"] === ingredient["@id"]
      );
      if (index !== -1) this.activeIngredients.splice(index, 1);

      this.removedIngredients.push(ingredient);
    },
  },
};
</script>
