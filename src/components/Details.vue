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
        <ClientWidget
          v-if="order"
          :people="order.client"
          context="client"
          :row="order"
          :configs="configs"
          @saved="loadData"
        />

        <AddressWidget
          v-if="order"
          :address="order.addressDestination"
          columnName="addressDestination"
          :configs="configs"
          :row="order"
          @saved="loadData"
        />
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <q-card class="q-mt-md">
          <Products
            :orderId="orderId"
            :context="context"
            @reload="reload"
            v-if="orderId"
          />
          <!-- <Invoice :orderId="orderId" :context="context" v-if="orderId" />-->
        </q-card>
      </div>
    </div>
  </q-page>
</template>
<script>
import DefaultDetail from "@controleonline/ui-default/src/components/Default/Common/DefaultDetail.vue";
import Invoice from "@controleonline/ui-financial/src/components/Invoice";
import Products from "./Products";
import { mapActions, mapGetters } from "vuex";
import getConfigs from "./Configs";
import AddressWidget from "@controleonline/ui-people/src/components/Address/Widget.vue";

import ClientWidget from "@controleonline/ui-people/src/components/People/Widget.vue";

export default {
  components: {
    DefaultDetail,
    ClientWidget,
    AddressWidget,
    Invoice,
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
  },
  data() {
    return {
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
    loadData() {
      this.reload();
    },
    saved(data) {
      this.$store.commit(this.configs.store + "/SET_ITEMS", data);
      this.$store.commit(this.configs.store + "/SET_ITEM", data[0]);

      this.$emit("saved", data);
    },
  },
};
</script>
