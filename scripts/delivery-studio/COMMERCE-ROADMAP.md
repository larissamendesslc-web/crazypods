# CRAZY COMMERCE — arquitetura de lançamento para produtos permitidos

## Estado atual (14 nov 2026)

**Entrega implementada em ambiente de demonstração:**
- Listagem de itens do catálogo usado como massa de teste.
- CEP: pesquisa ViaCEP e BrasilAPI.
- Entrega automática: tarifa fixa da unidade por cidade/bairro, quando configurada; senão distância em ruas, se houver geocodificação, usando provedor OSRM de demonstração.
- Duas unidades independentes; recomendação do menor percurso elegível, com opção de escolha manual.
- O resumo do carrinho recalcula subtotal, frete e total sempre que mudam o CEP, o catálogo ou as regras.
- Nenhum preço de entrega é presumido quando o CEP/rota não fornecem informação suficiente.
- O formulário não cria pedidos, envia WhatsApp nem processa pagamentos.

**Atenção:** o servidor público OSRM é só demonstração, com limites e sem SLA; para uso comercial contratar um provedor com API e proxy seguros, cache, rate limit, monitoração, validação server-side e política de contingência. Tarifas atuais são EXEMPLOS e devem ser revisadas pelo lojista.

## Evolução de catálogo genérico — produtos legalmente permitidos

Migrar estrutura para cadastro de acessórios de celular (capinhas, películas, fones e carregadores), sem atributos obrigatórios de pod (puffs/sabores).

Objetos sugeridos:

```ts
type PublicProduct = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  slug: string;
  description: string;
  photos: string[];
  priceCents: number;
  status: "draft" | "active" | "archived";
  legallySaleable: boolean; // validação também no servidor
};

type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  options: Record<string, string>; // cor, modelo compatível, tamanho
  priceOverrideCents?: number;
  stockByStore: Record<string, number>;
};
```

- Categoria editável no painel, com URL e SEO próprios, mas revisão obrigatória para conformidade.
- Preço/estoque por SKU e **por unidade**. Criar pedido deve reservar estoque com transação e chave idempotente.
- Categorias com venda proibida NÃO podem participar de checkout real nem ter links de compra, mesmo que algum administrador as marque erroneamente; adotar bloqueio server-side por classificação de produto.
- Não fazer inferência automática sobre legalidade a partir de nomes. Manter lista de classes restritas separada e verificável.
- Pedidos de testes e pedidos reais devem usar tabelas separadas e chaves diferentes. Nunca transformar simulações anteriores em vendas.

## Contrato de cotação real (a implementar)

```ts
type ShippingQuoteRequest = {
  destinationCep: string;
  destinationStreet: string;
  destinationNumber: string;
  items: { variantId: string; quantity: number }[];
};
type ShippingQuoteResponse = {
  quoteId: string;
  validUntil: string;
  storeId: string;
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  distanceKm?: number;
  calculation: "merchant-zone" | "licensed-road-provider";
};
```

**Toda cotação comercial precisa ser produzida e assinada/guardada pelo servidor:**
1. Buscar preços, variantes, condição legal, estoque e políticas de entrega atuais no banco, ignorando valores enviados pelo navegador.
2. Geocodificar o endereço completo com serviço contratado; não anunciar distância exata se baseada somente no centróide do CEP.
3. Resolver origem por disponibilidade de estoque + área coberta, não apenas pela loja fisicamente mais próxima.
4. Calcular taxas e descontos em centavos e devolver cotação expirada/identificável.
5. Pedido real somente se cotação ainda válida, preços confirmados, cliente aceita os valores e pagamento/gateway estiver habilitado.
6. Callback de pagamento validado por assinatura, transação idempotente, conferência do valor, baixa do estoque única e trilha de auditoria.
7. Possuir suporte a retirada, frete manual, endereço sem geocodificação e lojas fechadas; nunca inventar frete quando não houver resposta.

## Pré-requisitos para venda oficial

- Empresa e produtos legalmente habilitados para comércio; documentação fiscal, política de troca/devolução, atendimento, privacidade e LGPD.
- Lojista define endereço exato das duas unidades, área atendida, tarifas oficiais, horários e custo do motoboy.
- Canal de pagamentos contratado e conta verificada. Chaves secretas em servidor/secret manager, nunca em `VITE_*`.
- Hospedagem/serviços com monitoração, logs, alertas, backups e mecanismos antiabuso.
- Testes ponta a ponta (iOS/Android/desktop, meios de pagamento, falhas de estoque, estorno, falha de rota, webhook duplicado).
- Lançar novos produtos regulares no catálogo com importação/admin responsável; não utilizar itens de demonstração restritos como produtos vendáveis.

## Condição de lançamento

O módulo de demonstração NÃO É um gateway de compras.
O checkout real somente poderá ser ativado depois da revisão dos produtos permitidos,
validação das integrações, cumprimento dos requisitos legais e testes funcionais.
