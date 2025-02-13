<template>
  <q-page class="q-pa-md">
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
                      @loadData="loadData"
                    />
                  </q-item-label>
                </q-item-section>
                <q-item-section side v-if="order">
                  <q-badge color="white" :text-color="order.status.color">
                    <DefaultInput
                      columnName="status"
                      :row="order"
                      :configs="configs"
                      @saved="saved"
                      @loadData="loadData"
                    />
                  </q-badge>
                  <DefaultInput
                    v-if="order"
                    columnName="price"
                    :row="order"
                    :configs="configs"
                    @saved="saved"
                    @loadData="loadData"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Cards Menores -->
      <div class="col-12 col-md-4">
        <q-card class="q-mb-md">
          <q-card-section v-if="order">
            <q-card-section class="row items-center">
              <q-icon name="person" color="primary" size="md" class="q-mr-sm" />
              <div class="text-bold">{{ $tt("order", "label", "client") }}</div>
            </q-card-section>
            <q-card-section>
              <DefaultInput
                columnName="client"
                :row="order"
                :configs="configs"
                @saved="saved"
                @loadData="loadData"
              />

              <q-item-label v-for="phone in order.client.phone" caption
                >({{ phone.ddd }}) {{ phone.phone }}</q-item-label
              >
              <q-item-label v-for="phone in order.client.email" caption>
                {{ phone.email }}</q-item-label
              >
            </q-card-section>
          </q-card-section>
        </q-card>

        <q-card>
          <q-card-section>
            <q-card-section class="row items-center">
              <q-icon name="place" color="red" size="md" class="q-mr-sm" />
              <div class="text-bold">
                {{ $tt("order", "label", "Delivery Address") }}
              </div>
            </q-card-section>
            <q-card-section>
              <DefaultInput
                v-if="order"
                columnName="addressDestination"
                :row="order"
                :configs="configs"
                @saved="saved"
                @loadData="loadData"
              />
              <Address
                v-if="order"
                :row="order.addressDestination"
                :people="order.client"
                :configs="configsAddress"
              />
            </q-card-section>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <q-card class="q-mt-md">
          <q-tabs
            v-model="tab"
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
          >
            <q-tab
              name="products"
              icon="tab"
              :label="$tt('order', 'label', 'Products')"
            />
            <q-tab
              name="invoice"
              icon="tab"
              :label="$tt('order', 'label', 'Payments')"
            />
            <q-tab
              name="invoice_tax"
              icon="tab"
              :label="$tt('order', 'label', 'Taxes')"
            />
          </q-tabs>
          <q-tab-panels v-model="tab" animated>
            <q-tab-panel name="products">
              <Products
                :orderId="orderId"
                :context="context"
                @reload="reload"
                v-if="orderId"
              />
            </q-tab-panel>
            <q-tab-panel name="invoice">
              <Invoice :orderId="orderId" :context="context" v-if="orderId" />
            </q-tab-panel>
            <q-tab-panel name="invoice_tax">
              <InvoiceTax
                :orderId="orderId"
                :context="context"
                v-if="orderId"
              />
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
<script>
import DefaultDetail from "@controleonline/ui-default/src/components/Default/Common/DefaultDetail.vue";
import Invoice from "@controleonline/ui-financial/src/components/Invoice";
import InvoiceTax from "@controleonline/ui-accounting/src/components/InvoiceTax";
import Products from "./Products";
import DefaultInput from "@controleonline/ui-default/src/components/Default/DefaultInput.vue";
import { mapActions, mapGetters } from "vuex";
import getConfigs from "./Configs";

import Address from "@controleonline/ui-people/src/components/Address/Details.vue";
export default {
  components: {
    DefaultDetail,
    DefaultInput,
    Invoice,
    InvoiceTax,
    Products,
    Address,
  },
  props: {
    context: {
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
    configsAddress() {
      return {
        store: "address",
      };
    },
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
  },
  data() {
    return {
      tab: "products",
      orderId: null,
    };
  },
  created() {
    this.orderId = decodeURIComponent(this.$route.params.id);
    this.init();
  },
  methods: {
    ...mapActions({
      getOrder: "orders/get",
    }),
    init() {
      if (!this.isLoading)
        this.getOrder(this.orderId).then(() => {
          this.$store.commit(this.configs.store + "/SET_ITEMS", [this.order]);
        });
    },
    reload() {
      this.init();
    },
    saved(data) {
      this.$store.commit(this.configs.store + "/SET_ITEMS", data);
      this.$store.commit(this.configs.store + "/SET_ITEM", data[0]);

      this.$emit("saved", data);
    },
  },
};
</script>
