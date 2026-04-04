export const routes = [
  {
    path: "/orders/",
    component: () =>
      import("@controleonline/ui-layout/src/vue/layouts/AdminLayout.vue"),
    children: [
      {
        name: "OrderHistoryPage",
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
      import("@controleonline/ui-layout/src/vue/layouts/ClientLayout.vue"),
    children: [
      {
        name: "ClientOrdersIndex",
        path: "my",
        component: () => import("../pages/Client"),
      },
      {
        name: "ClientOrderDetails",
        path: "my/id/:id",
        component: () => import("../pages/Client/Details.vue"),
      },      
      {
        name: "ClientProfile",
        path: "my-profile",
        component: () => import("../pages/Orders/Details.vue"),
      },      
    ],
  },
];
