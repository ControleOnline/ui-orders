<template>
  <q-page>
    <div class="q-pt-lg">
      <q-card>
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Detalhes do pedido</div>
        </q-card-section>
        <q-card-section>
          <q-list bordered>
            <q-item>
              <q-item-section>
                <q-item-label>Pedição #{{ orderId }}</q-item-label>
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
                /></q-badge>

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

        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-sm-6">
              <q-list bordered>
                <q-item>
                  <q-item-section>
                    <q-item-label class="text-bold">Cliente</q-item-label>
                    <q-item-label>
                      <DefaultInput
                        v-if="order"
                        columnName="client"
                        :row="order"
                        :configs="configs"
                        @saved="saved"
                        @loadData="loadData"
                      />
                    </q-item-label>
                    <q-item-label caption>0800 888-8888 #012345</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
            <div class="col-xs-12 col-sm-6">
              <q-list bordered>
                <q-item>
                  <q-item-section>
                    <q-item-label class="text-bold"
                      >Endereço de entrega</q-item-label
                    >
                    <q-item-label>
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
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <div class="q-card q-pa-sm">
            <q-tabs
              inline-label
              no-caps
              outside-arrows
              mobile-arrows
              align="left"
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              v-model="tab"
            >
              <q-tab name="products" icon="tab" :label="$t('Products')" />
              <q-tab name="invoice" icon="tab" :label="$t('Invoices')" />
              <q-tab name="invoice_tax" icon="tab" :label="$t('Invoice Tax')" />
            </q-tabs>
            <q-tab-panels
              v-model="tab"
              animated
              swipeable
              transition-prev="jump-up"
              transition-next="jump-up"
            >
              <q-tab-panel class="items-center" name="products">
                <Products
                  :orderId="orderId"
                  :context="context"
                  @reload="reload"
                  v-if="orderId"
                />
              </q-tab-panel>
              <q-tab-panel class="items-center" name="invoice">
                <Invoice :orderId="orderId" :context="context" v-if="orderId" />
              </q-tab-panel>
              <q-tab-panel class="items-center" name="invoice_tax">
                <InvoiceTax
                  :orderId="orderId"
                  :context="context"
                  v-if="orderId"
                />
              </q-tab-panel>
            </q-tab-panels>
          </div>
        </q-card-section>
      </q-card>
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
        this.order.client.id
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
