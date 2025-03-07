<template>
  <q-page class="q-pa-md" v-if="!isLoading">
    <div class="row q-col-gutter-md">
      <!-- Card Principal -->
      <div class="col-12 col-md-8">
        <q-card class="full-height">
          <q-card-section class="text-primary">
            <div class="text-h6">
              {{ $tt("order", "header", "Order Details") }}
            </div>
          </q-card-section>
          <q-card-section>
            <q-list bordered>
              <q-item>
                <q-item-section>
                  <q-item-label
                    >{{ $tt("order", "label", "Order") }} #{{
                      orderId
                    }}</q-item-label
                  >
                  <q-item-label caption>
                    <DefaultInput
                      v-if="order"
                      columnName="orderDate"
                      :row="order"
                      :configs="configs"
                      @saved="saved"
                    />
                  </q-item-label>
                </q-item-section>
                <q-item-section side v-if="order">
                  <q-badge color="white" :text-color="order.status?.color">
                    <DefaultInput
                      columnName="status"
                      :row="order"
                      :configs="configs"
                      @saved="saved"
                    />
                  </q-badge>
                  <DefaultInput
                    v-if="order"
                    columnName="price"
                    :row="order"
                    :configs="configs"
                    @saved="saved"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Cards Menores -->
      <div class="col-12 col-md-4">
        <ClientWidget
          v-if="order"
          :people="order.client"
          context="client"
          :row="order"
          :configs="configs"
          @saved="saved"
        />

        <AddressWidget
          v-if="order"
          :address="order.addressDestination"
          columnName="addressDestination"
          :configs="configs"
          :row="order"
          @saved="saved"
        />
      </div>
    </div>

    <div class="row">
      <div class="col-12 q-mt-md">
        <DefaultButtonDialog :configs="componentConfigs" />
      </div>
      <div class="col-12">
        <q-card class="q-mt-md">
          <ProductsTable
            :orderId="orderId"
            :context="context"
            @reload="reload"
            v-if="orderId"
          />
          <!--<Products :orderId="orderId" :context="context" />-->
          <!-- <Invoice :orderId="orderId" :context="context" v-if="orderId" />-->
        </q-card>
      </div>
    </div>
  </q-page>
</template>
<script>
import DefaultDetail from "@controleonline/ui-default/src/components/Default/Common/DefaultDetail.vue";
import Invoice from "@controleonline/ui-financial/src/components/Invoice";
import { mapActions, mapGetters } from "vuex";
import getConfigs from "./Configs";
import AddressWidget from "@controleonline/ui-people/src/components/Address/Widget.vue";
import ProductsTable from "./ProductsTable";
import ProductList from "./ProductList";

import ClientWidget from "@controleonline/ui-people/src/components/People/Widget.vue";

export default {
  components: {
    ProductsTable,
    DefaultDetail,
    ClientWidget,
    AddressWidget,
    Invoice,
    ProductList,
  },
  props: {
    context: {
      required: true,
    },
    orderId: {
      required: true,
    },
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      columns: "orders/columns",
      order: "orders/item",
      isLoading: "orders/isLoading",
    }),

    configs() {
      let config = getConfigs(
        this.context,
        this.myCompany,
        null,
        this.order?.client?.id
      );
      config.externalFilters = false;
      config["full-height"] = false;
      return config;
    },
    componentConfigs() {
      return {
        component: ProductList,
        store: "order_products",
        label: "products",
        icon: "add",
      };
    },
  },
  data() {
    return {};
  },
  created() {
    if ((this.order && this.order.id == this.orderId) || this.isLoading) return;
    this.loadData();
  },
  methods: {
    ...mapActions({
      getOrder: "orders/get",
      setOrder: "orders/setItem",
      setOrders: "orders/setItems",
      setCart: "cart/setOrder",
    }),
    loadData() {
      this.getOrder(this.orderId).then((order) => {
        this.loaded([order]);
      });
    },
    loaded(data) {
      this.setOrders(data);
      this.setOrder(data[0]);
      this.setCart(data[0]);
    },

    saved(data) {
      this.$emit("saved", data);
      this.loaded(data);
    },
  },
};
</script>
