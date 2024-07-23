<template>
  <q-btn class="q-pa-xs btn-primary" dense icon="money" @click="openModal = true">
    <q-tooltip>
      Tooltip
    </q-tooltip>
  </q-btn>
  <q-dialog v-model="openModal" maximized>
    <q-card class="">
      <q-card-section class="row col-12 q-pa-sm">
        <q-toolbar class="">
          <q-toolbar-title class="">
            <Title></Title>
          </q-toolbar-title>
          <q-btn class="btn-primary" no-caps flat v-close-popup round dense icon="close" />
        </q-toolbar>
      </q-card-section>
      <q-card-section class="row q-pa-md">
        <q-form @submit="onSubmit" class="q-mt-sm" style="width: 100%" ref="myForm">
          <!--- show payment data-->
          <div class="row justify-center q-pb-md">
            <q-card-section>
              <q-item>
                <q-item-section>
                  <q-item-label header>Valor</q-item-label>
                  <q-item-label>
                    {{ this.row.value }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label header>Cliente</q-item-label>
                  <q-item-label>
                    {{ this.row.email }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-card-section>
          </div>
          <div class="row justify-center q-pb-md">
            <q-btn-toggle no-caps unelevated v-model="payment" toggle-color="primary" :options="[
              {
                label: 'Crédito',
                value:
                  this.installments > 1
                    ? 'CREDITO_PARCELADO_LOJA'
                    : 'CREDITO_AVISTA',
              },
              { label: 'Débito', value: 'DEBITO_AVISTA' },
            ]" />
          </div>
          <div class="row justify-center q-pb-md">
            <q-btn-toggle v-if="payment === 'CREDITO_PARCELADO_LOJA' || payment === 'CREDITO_AVISTA'
              " no-caps unelevated v-model="installments" toggle-color="primary" :options="installmentsOptions" />
          </div>
          <div class="row justify-center q-pb-md">
            <q-btn label="Pagar" icon="payment" size="md" color="green" class="q-ml-sm" @click="onSubmit" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  data() {
    return {
      payment: "credito",
      installments: 1,
      openModal: false,
      installmentsOptions: [
        { label: '1x', value: 1 },
        { label: '2x', value: 2 },
        { label: '3x', value: 3 },
        { label: '4x', value: 4 },
        { label: '5x', value: 5 },
        { label: '6x', value: 6 },
        { label: '7x', value: 7 },
        { label: '8x', value: 8 },
        { label: '9x', value: 9 },
        { label: '10x', value: 10 },
        { label: '11x', value: 11 },
        { label: '12x', value: 12 },
      ],
    };
  },
  props: {
    row: {
      type: Object,
      required: true,
      default: {
        clientID: 1,
        email: 'luiz.kim@controleonline.com',
        items: [
          {
            name: 'Geral',
            quantity: 1,
            sku: '10',
            unitOfMeasure: 'unidade',
            unitPrice: 50.00,
          },
        ],
        value: 50.00,
      }
    },
  },
  methods: {
    payLio(
      //  accessToken,
      clientID,
      email,
      installments,
      items,
      paymentCode,
      value
    ) {
      const data = {
        accessToken: process.env.CIELO?.LIO_ACCESS_TOKEN,
        clientID: clientID,
        email: email,
        installments: installments,
        items: items,
        paymentCode: paymentCode,
        value: value,
      };

      //encode data to base64
      const base64data = btoa(JSON.stringify(data));
      //redirect to lio
      console.log("data:", data);
      const cieloUrl = `lio://payment?request=${base64data}&urlCallback=order://response`;
      //const $q = useQuasar();
      if (this.$q.platform.is.mobile || 1 == 1) {
        window.open(cieloUrl, "_system");
      } else if (window.cordova && window.cordova.InAppBrowser) {
        window.cordova.InAppBrowser.open(cieloUrl, "_system");
      } else {
        console.error("Cordova InAppBrowser plugin not available.");
        alert("Essa funcionalidade só está disponível no aplicativo.");
      }
    },
    onSubmit() {
      this.$emit("pay", {
        payment: this.payment,
        installments: this.installments,
      });
      this.payLio(
        this.row.clientID,
        this.row.email,
        this.installments,
        this.row.items,
        this.payment,

        this.row.value
      );
    },
  },
};
</script>
