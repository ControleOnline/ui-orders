export const routes = [
  {
    path: "/orders/",
    component: () =>
      import("@controleonline/ui-layout/src/layouts/AdminLayout.vue"),
    children: [
      {
        name: "SalesOrderIndex",
        path: "sales",
        component: () => import("../pages/Orders"),
      },
      {
        name: "OrderDetails",
        path: "sales/id/:id",
        component: () => import("../pages/Orders/Details.vue"),
      },     
      
      {
        name: "PurchasingOrderIndex",
        path: "purchasing",
        component: () => import("../pages/Orders"),
      },
      {
        name: "PurchasingOrderDetails",
        path: "purchasing/id/:id",
        component: () => import("../pages/Orders/Details.vue"),
      },  
    ],
  },
];
