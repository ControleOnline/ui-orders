export default function getConfigs(context, myCompany, invoiceId, peopleId) {
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
      addressDestination: {
        filters: {
          people: "/people/" + peopleId,
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
