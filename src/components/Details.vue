<template>
  <q-page>
    <!-- Inicio das Abas -->
    <div class="q-pt-lg">
      <q-card>
        <q-card-section>
          <div
            class="q-card q-pa-sm"
            style="max-width: calc(var(--zoom-width) - 30px)"
          >
            <DefaultDetail
              :configs="configs"
              :id="orderId"
              v-if="orderId"
            />
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
              <q-tab name="invoice" icon="tab" :label="$t('Invoices')" />
            </q-tabs>
            <q-tab-panels
              v-model="tab"
              animated
              swipeable
              transition-prev="jump-up"
              transition-next="jump-up"
            >
              <q-tab-panel class="items-center" name="invoice">
                <Invoice :orderId="orderId" :context="context" v-if="orderId" />
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

import { mapActions, mapGetters } from "vuex";
import getConfigs from "./Configs";

export default {
  components: {
    DefaultDetail,
    Invoice,
  },
  props: {
    context: {
      required: true,
    },
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      columns: "invoice/columns",
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
      tab: "invoice",
      orderId: null,
    };
  },
  created() {
    this.orderId = decodeURIComponent(this.$route.params.id);
  },
  methods: {

  },
};
</script>
