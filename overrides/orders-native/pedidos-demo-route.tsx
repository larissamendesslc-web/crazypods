import { createFileRoute } from "@tanstack/react-router";
import { ShopShell } from "@/components/shop";
import { SampleOrdersCustomer } from "@/components/orders-demo";

export const Route = createFileRoute("/pedidos-demo")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Demonstração de pedidos | Crazy Pods" },
      { name: "description", content: "Prévia técnica de recebimento de referências fictícias pelo WhatsApp." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <ShopShell><SampleOrdersCustomer /></ShopShell>,
});
