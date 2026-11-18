export const DELIVERY_STATES: Record<string, string> = {
  atribuido: "Em preparo", em_rota: "Saiu para entrega", entregue: "Entregue", problema: "Ocorrência na entrega", cancelado: "Cancelado",
};
export const locationFresh = (recordedAt: string, now = Date.now()) => now - Date.parse(recordedAt) <= 90_000 && now >= Date.parse(recordedAt);
export const canAssignDelivery = (status: string, payment: string) => status === "pago" || (status === "pendente" && payment === "dinheiro");
export const canShareLocation = (state: string, orderStatus: string) => state === "em_rota" && orderStatus === "enviado";