<template>
  <DefaultTable
    :configs="configs"
    @saved="reload"
    @reload="reload"
    :key="key"
  />
</template>
<script>
import { mapActions, mapGetters } from "vuex";
import * as DefaultFiltersMethods from "@controleonline/ui-default/src/components/Default/Scripts/DefaultFiltersMethods";
import ProductList from "./ProductList";

export default {
  components: {
    ProductList,
  },
  props: {
    context: {
      required: true,
    },
    loaded: {
      type: Boolean,
      required: true,
    },
    orderId: {
      required: true,
    },
    peopleId: {
      required: false,
    },
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      columns: "product_orders/columns",
    }),

    configs() {
      return {
        filters: true,
        "full-height": false,
        store: "product_orders",
        editable: false,
        add: false,
        delete: true,
        selection: false,
        search: false,
        components: {
          headerActions: [
            {
              component: this.$components.DefaultButtonDialog,
              configs: {
                component: ProductList,
                store: "product_orders",
                label: "products",
                icon: "add",
                orderId: this.orderId,
              },
            },
          ],
        },
      };
    },
    filters() {
      return this.$store.getters[this.configs.store + "/filters"] || {};
    },
  },
  data() {
    return {
      loaded: false,
      key: 0,
    };
  },
  created() {
    this.addFilter("order", "orders/" + this.orderId);
    this.addFilter("parent_product", "null");
  },
  methods: {
    ...DefaultFiltersMethods,
    reload() {
      this.$emit("reload");
    },
  },
};
</script>
