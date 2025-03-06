<template>
  <template v-if="show">
    <div
      class="row col-12 bottom-cart sticky-bottom full-width bg-white q-pa-md"
    >
      <div class="col flex items-center justify-center">{{ order.price }}</div>
      <div class="col flex items-center justify-center">
        <q-btn class="full-width q-pa-xs btn-primary" label="Ver Carrinho" />
      </div>
    </div>
  </template>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  components: {},
  computed: {
    ...mapGetters({
      order: "cart/order",
    }),
  },
  props: {
    show: {
      default: true,
    },
  },
  data() {
    return {
      orderId: 59628,
    };
  },
  created() {
    this.init();
  },
  methods: {
    ...mapActions({
      setOrder: "cart/setOrder",
      getOrder: "orders/get",
    }),

    init() {
      this.getOrder(this.orderId).then((result) => {
        this.setOrder(result);
      });
    },
  },
};
</script>
