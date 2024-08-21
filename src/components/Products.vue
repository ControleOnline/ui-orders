<template>
    <DefaultTable :configs="configs"  />
</template>
<script>
import DefaultTable from "@controleonline/ui-default/src/components/Default/DefaultTable";
import { mapActions, mapGetters } from "vuex";

export default {
    components: {
        DefaultTable,
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
            return {
                filters: true,
                "full-height": false,
                store: "product_orders",
                editable:false,
                add: true,
                delete: false,
                selection: false,
                search: true,
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

    },
    methods: {
    },
};
</script>