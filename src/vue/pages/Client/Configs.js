export default function getConfigs(context, myCompany, invoice, peopleId) {
  return {
    companyParam: invoice ? false : context == "sales" ? "provider" : "client",
    filters: true,
    status: ["order"],
    store: "orders",
    add: true,
    
    delete: false,
    selection: false,
    search: false,
    columns: {
      client:{
        editable:false,
      },
      category: {
        filters: {
          context: context,
          company: "/people/" + myCompany?.id,
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
