export default function getConfigs(context, myCompany, invoiceId) {
  return {
    companyParam: invoiceId
      ? false
      : context == "sales"
      ? "provider"
      : "client",
    filters: true,
    status: ["order"],
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
  };
}
