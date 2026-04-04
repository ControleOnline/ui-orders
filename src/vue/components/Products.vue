<template>
  <div class="row">
    <DefaultButtonDialog :configs="configs" />
    <div class="col-12">
      <div
        v-for="orderProduct in topLevelOrderProducts"
        :key="orderProduct.id"
        class="order-product-item"
      >
        <div class="row">
          <div class="col-12">
            {{ orderProduct.quantity }} X {{ orderProduct.product.product }}
          </div>
        </div>
        <div v-if="hasChildren(orderProduct)" class="row sub-level">
          <div
            v-for="child in getChildren(orderProduct)"
            :key="child.id"
            class="col-12"
          >
            {{ child.quantity }} X {{ child.product.product }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import * as DefaultFiltersMethods from "@controleonline/ui-default/src/vue/components/Default/Scripts/DefaultFiltersMethods";
import ProductList from "./ProductList";

export default {
  components: {
    ProductList,
  },
  props: {
    context: { required: true },
    loaded: { type: Boolean, required: true },
    orderId: { required: true },
    peopleId: { required: false },
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      columns: "order_products/columns",
    }),
    configs() {
      return {
        component: ProductList,
        store: "order_products",
        label: "products",
        icon: "add",
      };
    },
    filters() {
      return this.$store.getters[this.configs.store + "/filters"];
    },
    topLevelOrderProducts() {
      return this.orderProducts.filter(
        (op) => !op.parentProduct || op.parentProduct === null
      );
    },
  },
  data() {
    return {
      orderProducts: [],
      loaded: false,
      key: 0,
    };
  },
  created() {
    this.getOrderProducts({
      order: "orders/" + this.orderId,
    }).then((result) => {
      this.orderProducts = result;
      this.loaded = true;
    });
  },
  methods: {
    ...DefaultFiltersMethods,
    ...mapActions({
      getOrderProducts: "order_products/getItems",
    }),
    reload() {
      this.$emit("reload");
    },
    hasChildren(orderProduct) {
      const children = this.getChildren(orderProduct);
      return children.length > 0;
    },
    getChildren(orderProduct) {
      const children = this.orderProducts.filter((op) => {
        return (
          op.parentProduct &&
          op.parentProduct["@id"] === orderProduct.product["@id"] &&
          op.orderProduct["@id"] == orderProduct["@id"]
        );
      });
      return children;
    },
  },
};
</script>

<style scoped>
.order-product-item {
  margin-bottom: 10px;
}
.sub-level {
  margin-left: 20px;
}
</style>
