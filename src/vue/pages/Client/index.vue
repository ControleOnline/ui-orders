<template>
  <div class="q-pa-md">
    <q-table
      title="Pedidos"
      :rows="orders || []"
      :columns="columns"
      row-key="id"
      :rows-per-page-options="[12, 48]"
      :loading="isLoading"
      v-model:pagination="pagination"
      grid
      @request="onRequest"
    >
      <template v-slot:item="props">
        <div class="q-pa-sm col-xs-12 col-sm-6 col-md-4">
          <q-card
            class="q-pa-md"
            clickable
            @click="goToOrderDetails(props.row.id)"
          >
            <div class="flex justify-between items-center q-mb-sm">
              <div class="text-subtitle1">
                {{ $tt("order", "header", "order") }} #{{ props.row.id }}
              </div>
              <q-badge
                :style="{ backgroundColor: props.row.status.color }"
                class="text-white"
              >
                {{ $tt("status", "orders", props.row.status.status) }}
              </q-badge>
            </div>
            <div class="text-caption text-grey-7">
              {{ $tt("order", "input", "date") }}:
              {{ new Date(props.row.orderDate).toLocaleDateString("pt-br") }}
            </div>
            <div class="text-caption text-grey-7">
              {{ props.row.provider.alias }}
            </div>
            <div class="text-subtitle2 q-mt-sm">
              {{ $formatter.formatMoney(props.row.price, "R$", "pt-br") }}
            </div>
          </q-card>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { defaultCompany } from "../../../../../ui-people/src/store/people/customActions";

export default {
  computed: {
    ...mapGetters({
      orders: "orders/items",
      totalItems: "orders/totalItems",
      isLoading: "orders/isLoading",
      myCompany: "people/currentCompany",
      defaultCompany: "people/defaultCompany",
    }),
  },
  watch: {
    totalItems(newValue) {
      this.pagination.rowsNumber = newValue;
    },
  },
  data() {
    return {
      columns: [{ name: "id", label: "ID", field: "id" }],
      pagination: {
        rowsNumber: this.totalItems,
        page: 1,
        rowsPerPage: 12,
      },
    };
  },
  created() {
    this.init();
  },
  watch: {
    myCompany() {
      this.init();
    },
  },
  methods: {
    ...mapActions({
      getItems: "orders/getItems",
    }),
    init() {
      if (!this.myCompany?.id) return;
      this.getItems({
        client: this.myCompany.id,
        provider: this.defaultCompany.id,
        page: this.pagination.page,
        itemsPerPage: this.pagination.rowsPerPage,
      });
    },
    onRequest(props) {
      console.log(props.pagination);
      this.pagination = props.pagination;
      this.init();
    },
    goToOrderDetails(id) {
      this.$router.push({ name: "ClientOrderDetails", params: { id } });
    },
  },
};
</script>

<style scoped>
.q-card {
  cursor: pointer;
}
</style>
