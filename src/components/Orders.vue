<template>
  <DefaultTable :configs="configs" v-if="loaded" />
</template>
<script>

import * as DefaultFiltersMethods from "@controleonline/ui-default/src/components/Default/Scripts/DefaultFiltersMethods.js";

import { mapActions, mapGetters } from "vuex";
import getConfigs from "./Configs";
export default {
  components: {
    
  },
  props: {
    context: {
      required: true,
    },
    loaded: {
      type: Boolean,
      required: true,
    },
    invoiceId: {
      required: false,
    },
    peopleId: {
      required: false,
    },
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      columns: "orders/columns",
    }),

    configs() {
      let config = getConfigs(this.context, this.myCompany, this.invoiceId);

      if (this.invoiceId) {
        config.externalFilters = false;
        config["full-height"] = false;
      }
      if (this.peopleId) {
        config.externalFilters = false;
        config["full-height"] = false;
      }
      return config;
    },
    filters() {
      return this.$store.getters[this.configs.store + "/filters"] || {};
    },
  },
  data() {
    return {
      loaded: false,
    };
  },
  created() {
    this.loadPersistentFilters();
    this.setColumns();
    this.setFilters();
  },
  methods: {
    ...DefaultFiltersMethods,
    setFilters() {
      let filters = this.$copyObject(this.filters);
      let field = this.context == "sales" ? "client" : "provider";

      if (!filters.order) filters.order = { alterDate: "DESC" };
      if (this.invoiceId) filters.invoiceId = this.invoiceId;
      if (this.peopleId) filters[field] = "/people/" + this.peopleId;
      this.$store.commit(this.configs.store + "/SET_FILTERS", filters);

      this.loaded = true;
    },

    setColumns() {
      const columns = this.$copyObject(this.columns);
      const columnIndex = columns.findIndex(
        (c) => c.name === "provider" || c.name === "client"
      );
      if (columnIndex !== -1) {
        columns[columnIndex].name =
          this.context === "sales" ? "client" : "provider";
        columns[columnIndex].label =
          this.context === "sales" ? "client" : "provider";
      }

      const columnIdIndex = columns.findIndex((c) => c.name === "id");
      if (columnIdIndex !== -1) {
        columns[columnIdIndex].to = (value) => {
          let route =
            this.context === "sales" ? "OrderDetails" : "OrderDetails";
          return {
            name: route,
            params: {
              id: value,
            },
          };
        };
      }

      this.$store.commit(this.configs.store + "/SET_COLUMNS", columns);
    },
  },
};
</script>
