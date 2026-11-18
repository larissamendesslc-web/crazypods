export const STATUS_STYLES: Record<string, string> = {
  pendente: "bg-accent/15 text-accent",
  pago: "bg-primary/15 text-primary",
  enviado: "bg-success/15 text-success",
  entregue: "bg-success/25 text-success",
  cancelado: "bg-destructive/15 text-destructive",
};
export const ORDER_STATUSES = ["pendente", "pago", "enviado", "entregue", "cancelado"] as const;