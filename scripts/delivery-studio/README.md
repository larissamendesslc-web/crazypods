# CRAZY DELIVERY 2.0 — ambiente demonstrativo

Versão de testes integrada ao Crazy Pods existente, sem habilitar compras ou entrega comercial de dispositivos eletrônicos para fumar.

## Interface e fluxo

- Mantém o visual Black Volt, categorias e carrinho flutuante.
- O carrinho utiliza os produtos cadastrados somente como **massa de dados de simulação**.
- Consulta CEP por ViaCEP/BrasilAPI; busca por rua se cliente desconhece o CEP.
- Número, complemento, nome e telefone podem ser preenchidos para avaliar a interface, sem serem enviados ao banco pelo módulo de testes.
- Tarifas por unidade, faixas de quilômetros, raio máximo e frete grátis configuráveis em **Painel > Site > Delivery Studio 2.0**.
- Alterações demonstrativas passam ao carrinho **após clicar em Salvar regras do simulador**.
- Campos e preços de pagamento apenas ilustrativos (Pix, cartão, dinheiro).
- O botão **Concluir simulação** gera somente resumo local de teste; não cria pedido, estoque, movimentação financeira, Pix, cobrança ou mensagem por WhatsApp.

## Cálculo e limitações importantes

As faixas e valores iniciais são *fictícios*, não representam tarifas do Crazy1 ou de qualquer loja.

Para simular distância por ruas:
1. Administrador cadastra CEP e coordenadas das unidades em Configurações.
2. Usuário informa CEP válido cuja consulta também disponibilize coordenadas.
3. Clica em **Calcular distância pelas ruas (teste)**.
4. Uma única consulta para até duas unidades usa a matriz do OSRM público. O site indica a origem e mostra quilômetros estimados por CEP e minutos aproximados.
5. Quando dados/serviço não estiverem disponíveis, há campo **Distância manual para testes** com identificação inequívoca. O sistema nunca confunde uma distância em linha reta com rota viária.

Servidor demo OSRM: https://router.project-osrm.org. Serviço comunitário não comercial, sujeito a indisponibilidade e limite de uso. Para um e-commerce legal e de verdade, deve ser substituído por roteamento contratado + cálculo final no servidor. A geolocalização do CEP é aproximada (BrasilAPI), não considera número do imóvel ou condições de trânsito.

## Persistência e segurança

Utiliza a tabela já existente `site_settings` e a função de salvamento existente `saveSettingsPatch` sob autenticação/admin e RLS existentes, sem novas tabelas/migrations.

A configuração é salva em chaves separadas:
- Preview: `crazy_delivery_demo_preview_v1`
- Produção: `crazy_delivery_demo_v1`

As regras são validadas ao ler e antes de salvar. Controles no navegador e preços simulados não representam cotação comercial autorizada.

## Estratégia de build

O repositório contém um ZIP com o aplicativo, e no build aplica patches sobre o ZIP. O instalador `scripts/delivery-studio/install.mjs` copia os três módulos TS/TSX e faz substituições pontuais, falhando quando um ponto de integração não existe. Os patches originais e o visual são preservados.

## Testes

```sh
node --experimental-strip-types --test scripts/delivery-studio/rates.test.mjs scripts/delivery-studio/route-demo.test.mjs
```

CI automatizado: `.github/workflows/crazy-delivery-studio.yml`.

Cenários a verificar manualmente: CEP válido, CEP inexistente, busca por endereço, faltam coordenadas, falha de OSRM, duas lojas com preços diferentes, tarifa máxima, frete grátis, zero rotas, modalidade não selecionada, iPhone/Android/desktop, administrador salvando e o carrinho refletindo.

## Para futuro e-commerce legal de fones

Implementar avaliação regulatória da categoria, checkout REAL independente, gateway de pagamento contratado, servidor seguro para cálculo da tarifa final, cotação idempotente e com expiração, gestão de estoque, limites de área, autenticação/autorização, políticas RLS, prevenção de abuso, privacidade dos endereços e notificações autorizadas por WhatsApp Business.

**Não remover o modo de demonstração em produção sem revisão técnica, legal e testes reais de pagamento.**
