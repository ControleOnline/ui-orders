<template>
    <q-btn class="q-pa-xs btn-primary" dense icon="settings"  @click="openModal = true">
        <q-tooltip>
            {{
                $t(componentProps.context + '.btn.categories_' + componentProps.context)
            }}
        </q-tooltip>
    </q-btn>
    <q-dialog v-model="openModal" maximized>
        <q-card class="">
            <q-card-section class="row col-12 q-pa-sm">
                <q-toolbar class="">
                    <q-toolbar-title class="">{{
                        $t(componentProps.context +'.title.categories_' + componentProps.context)
                    }}</q-toolbar-title>
                    <q-btn class="btn-primary" no-caps flat v-close-popup round dense icon="close" />
                </q-toolbar>
            </q-card-section>
            <q-card-section class="row q-pa-md">
                <Table :context="componentProps.context" />
            </q-card-section>
        </q-card>
    </q-dialog>
</template>
<script>
import Table from "./Table";

export default {
    props: {
        componentProps: {

        }
    },
    components: {
        Table
    },
    computed: {
    },
    created() {
    },
    data() {
        return {
            openModal: false
        }
    },
    watch: {
    },
    methods: {
    }
}
</script>