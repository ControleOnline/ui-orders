<template>
    <DefaultTable :configs="configs"  />
</template>
<script>

import { mapActions, mapGetters } from "vuex";
import * as DefaultFiltersMethods from "@controleonline/ui-default/src/components/Default/Scripts/DefaultFiltersMethods";
import ProductList from "./ProductList";

export default {
    components: {
        ProductList
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
                add: true,
                delete: true,
                selection: false,
                search: false,
                components: {
          headerActions: [{
            component: ProductList,
            props: {
              people: this.orderId,
            },
          }],
          tableActions: {
            component: ProductList,
          },
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
        };
    },
    created() {
        this.addFilter("order",'orders/'+ this.orderId);
    },
    methods: {
    ...DefaultFiltersMethods,
  },
};
</script>