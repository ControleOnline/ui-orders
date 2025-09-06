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
          <q-card-section>
            <Payment :order="order" :invoice="invoices[0]"/>
          </q-card-section>
        </q-card>
      </div>

      <!-- Cards Menores -->
      <div class="col-12 col-md-4">
        <q-card class="q-mb-md">
          <q-card-section>
            <q-card-section class="row items-center">
              <q-icon name="person" color="primary" size="md" class="q-mr-sm" />
              <div class="text-bold">{{ $tt("people", "label", context) }}</div>
            </q-card-section>
            <q-card-section>
              {{ order.client.name }}{{ order.client.alias }}

              <q-item-label v-for="phone in order.client.phone" caption
                >({{ phone.ddd }}) {{ phone.phone }}</q-item-label
              >
              <q-item-label v-for="phone in order.client.email" caption>
                {{ phone.email }}</q-item-label
              >
            </q-card-section>
          </q-card-section>
        </q-card>

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
import DefaultDetail from "@controleonline/ui-default/src/vue/components/Default/Common/DefaultDetail.vue";
import Invoice from "@controleonline/ui-financial/src/vue/components/Invoice";
import { mapActions, mapGetters } from "vuex";
import getConfigs from "./Configs";
import AddressWidget from "@controleonline/ui-people/src/vue/components/Address/Widget.vue";
import ProductsTable from "./ProductsTable";
import ProductList from "./ProductList";
import Payment from "@controleonline/ui-financial/src/vue/components/Payment.vue";
import ClientWidget from "@controleonline/ui-people/src/vue/components/People/Widget.vue";

export default {
  components: {
    Payment,
    ProductsTable,
    DefaultDetail,
    ClientWidget,
    AddressWidget,
    Invoice,
    ProductList,
  },

  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      columns: "orders/columns",
      invoices: "invoice/items",      
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
    return {
      context: "sales",
      orderId: null,
    };
  },
  created() {
    this.orderId = decodeURIComponent(this.$route.params.id);
    if ((this.order && this.order.id == this.orderId) || this.isLoading) return;
    this.loadData();
  },
  methods: {
    ...mapActions({
      getInvoices: "invoice/getItems",
      getOrder: "orders/get",
      setOrder: "orders/setItem",
      setOrders: "orders/setItems",
      setCart: "cart/setOrder",
    }),
    loadData() {



      this.getOrder(this.orderId).then((order) => {
        this.loaded([order]);
      });

            this.getInvoices({'order.order': this.orderId}).then((data) => {
        console.log(data);
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
