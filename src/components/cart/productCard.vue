<template>
  <div
    class="q-card q-hoverable product-card q-card col-6 col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 q-gutter-md q-mt-md"
    @mouseenter="hoveredProduct = product.id"
    @mouseleave="hoveredProduct = null"
  >
    <DefaultCarousel
      v-if="product.productFiles"
      :row="{ product: product['@id'] }"
      :configs="carouselConfigs"
      :files="product.productFiles"
    />
    <div class="badge sale btn-primary">ON SALE</div>
    <div class="q-pa-sm text-center">
      <div class="row q-pa-sm col-12">
        <div
          class="icon-container row col-12"
          v-if="1 == 1 || hoveredProduct === product.id"
        >
          <q-btn
            flat
            round
            icon="favorite"
            class="icon-box"
            @click="click('vovkrir')"
          />
          <q-btn flat round icon="shopping_cart" class="icon-box" />
          <q-btn flat round icon="share" class="icon-box" />
          <q-btn
            flat
            round
            icon="info"
            class="icon-box"
            @click="showDetails(product.id)"
          />
        </div>
        <div class="row col-8 text-left column">
          <div class="text-subtitle1 text-weight-bolder">
            <q-rating
              :model-value="4"
              :max="5"
              size="16px"
              color="amber"
              color-inactive="grey"
              readonly
            />
          </div>
          <div class="text-subtitle1 text-weight-bolder">
            {{ product.product }}
          </div>
        </div>
        <div class="col-4 text-right column">
          <div class="text-grey-6 text-subtitle1">
            {{ "R$ " + $formatter.formatMoney(product.price, "BRL", "pt-br") }}
          </div>
          <div class="text-subtitle1 text-h6 text-blue-8">$ 24.05</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";

export default {
  data() {
    return {
      hoveredProduct: null,
    };
  },

  props: {
    product: {
      required: true,
    },
  },
  computed: {
    carouselConfigs() {
      return {
        store: "product_file",
        isAdmin: false,
        context: "products",
      };
    },
  },
  created() {},

  methods: {
    showDetails(productId) {
      this.$emit("showDetails", productId);
    },
  },
};
</script>
