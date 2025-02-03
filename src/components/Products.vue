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
        expanded: {
          component: this.$components.DefaultTable,
          store: "expanded_product_orders",
          editable: false,
          delete: false,
          bottom: false,
          headers: false,
          noExpand(row) {
            return row.product.type != "custom";
          },
          filters(row) {
            return {
              order: row.order,
              parentProduct: row.product["@id"],
              orderProduct: row["@id"],
            };
          },
        },
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
    this.addFilter("exists[parentProduct]", "false");
  },
  methods: {
    ...DefaultFiltersMethods,
    ...mapActions({
      getOrderProducts: "product_orders/getItems",
    }),
    reload() {
      this.$emit("reload");
    },
  },
};
</script>
