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
              <q-item-section side>
                <DefaultInput
                  v-if="order"
                  columnName="status"
                  :row="order"
                  :configs="configs"
                  @saved="saved"
                  @loadData="loadData"
                />
                <q-badge color="red" text-color="white">Pendente</q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
      <div class="row q-col-gutter-md">
        <q-card class="col">
          <q-card-section>
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
          </q-card-section>
        </q-card>
        <q-card class="col">
          <q-card-section>
            <q-item>
              <q-item-section>
                <q-item-label class="text-bold"
                  >Endereço de entrega</q-item-label
                >
                <q-item-label>13000-000</q-item-label>
                <q-item-label caption
                  >Rua Paraíso - Bairro Feliz, Campinas - SP</q-item-label
                >
                <q-item-label caption>Apartamento 9000</q-item-label>
              </q-item-section>
            </q-item>
          </q-card-section>
        </q-card>
      </div>
      <q-card>
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

export default {
  components: {
    DefaultDetail,
    DefaultInput,
    Invoice,
    InvoiceTax,
    Products,
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
    }),
    configs() {
      let config = getConfigs(this.context, this.myCompany);
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
      this.getOrder(this.orderId).then(() => {
        this.$store.commit(this.configs.store + "/SET_ITEMS", [this.order]);
      });
    },
    saved(data) {
      this.$store.commit(this.configs.store + "/SET_ITEMS", data);
      this.$store.commit(this.configs.store + "/SET_ITEM", data[0]);

      this.$emit("saved", data);
    },
  },
};
</script>
