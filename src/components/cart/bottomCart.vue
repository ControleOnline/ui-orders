<template>
  <template v-if="show">
    <div
      class="row col-12 bottom-cart sticky-bottom full-width bg-white q-pa-md"
    >
      <div class="col flex items-center justify-center">{{ order.price }}</div>
      <div class="col flex items-center justify-center">
        <q-btn
          class="full-width q-pa-xs btn-primary"
          label="Ver Carrinho"
          @click="toCart"
        />
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
      reload: "cart/reload",
    }),
  },
  props: {
    show: {
      default: true,
    },
  },
  data() {
    return {};
  },
  created() {
    this.init();
  },
  watch: {
    reload() {
      if (this.reload == true) this.init(this.reload);
      this.setReload(false);
    },
  },
  methods: {
    ...mapActions({
      discoveryCard: "cart/discoveryCard",
      setReload: "cart/setReload",
    }),

    init(reload) {
      if (!this.order?.id || reload) this.discoveryCard();
    },
    toCart() {
      this.$router.push({ name: "ShopCart" });
    },
  },
};
</script>
