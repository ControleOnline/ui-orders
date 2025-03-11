export const routes = [
  {
    path: "/orders/",
    component: () =>
      import("@controleonline/ui-layout/src/vue/layouts/AdminLayout.vue"),
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
  {
    path: "/orders/",
    component: () =>
      import("@controleonline/ui-layout/src/vue/layouts/MainLayout.vue"),
    children: [
      {
        name: "ClientOrdersIndex",
        path: "my",
        component: () => import("../pages/Orders"),
      },
      {
        name: "ClientOrderDetails",
        path: "my/id/:id",
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
