import FormPayment from "@controleonline/ui-orders/src/components/Cielo/FormPayment.vue";

export default function getConfigs(context, myCompany,invoiceId) {
  return{
    companyParam: invoiceId
      ? false
      : context == "sales"
      ? "provider"
      : "client",
    filters: true,
    store: "orders",
    add: true,
    delete: false,
    selection: false,
    search: false,
    columns: {
      category: {
        filters: {
          context: context,
          company: "/people/" + myCompany.id,
        },
      },
      status: {
        filters: {
          context: "order",
        },
      },
    },
    components: {
      tableActions: {
        //component: OtherInformations,
        component: FormPayment,
        props: {
          context: context,
        },
      },
      headerActions: {
        //component: Status,
        props: {
          context: context,
        },
      },
    },
  };
}
