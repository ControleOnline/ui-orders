<template>
  <template v-if="show">
    <div
      class="row col-12 bottom-cart sticky-bottom full-width bg-white q-pa-md"
    >
      <div class="col flex items-center justify-center text-primary">
        {{ $formatter.formatMoney(order?.price, "R$", "pt-br") }}
      </div>
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
import { defaultCompany } from "../../../../../ui-people/src/store/people/customActions";

export default {
  components: {},
  computed: {
    ...mapGetters({
      order: "cart/item",
      reload: "cart/reload",
      myCompany: "people/currentCompany",
      defaultCompany: "people/defaultCompany",
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
    myCompany() {
      this.init(true);
    },
    reload() {
      if (this.reload == true) this.init(this.reload);
      this.setReload(false);
    },
  },
  methods: {
    ...mapActions({
      discoveryCart: "cart/discoveryCart",
      setReload: "cart/setReload",
    }),

    init(reload) {
      if ((!this.order?.id || reload) && this.myCompany?.id)
        this.discoveryCart({
          provider: this.defaultCompany.id,
          client: this.myCompany.id,
        });
    },
    toCart() {
      this.$router.push({ name: "ShopCart" });
    },
  },
};
</script>
