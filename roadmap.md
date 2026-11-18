## Visual
- [x] Refinar apresentação da logo original sem ampliar além da resolução disponível, neve discreta nas bordas, enquadramento das fotos, botões e menu móvel do painel; navegação autenticada e telas verificadas em 320px, 390px e 1280px sem transbordamento ou erros.
- [x] Corrigir valores cortados no Financeiro, Estoque e resumo; página do produto contida em 320px, 390px e 1280px, com painel autenticado e valores reais sem cortes. Nenhum registro alterado.
- [x] Corrigir letras cortadas nas marcas e títulos; Natal ativado com fundo branco, neve, gorros e composição festiva. Conferido em 878px e 390px, sem transbordamento horizontal ou imagens ausentes.

## Pagamentos
- [x] Conectar conta Asaas de teste com segurança; conexão vinculada e consulta de clientes respondeu HTTP 200. Não há cobrança criada nesta etapa.
- [x] Adaptar novas cobranças ao Asaas de teste, preservando cobranças Stripe antigas; criar retorno e confirmação protegida, painel Pagamentos e bloqueio de criação duplicada. 19 testes passaram; painel autenticado verificado.
- [x] Salvar ASAAS_TEST_WEBHOOK_TOKEN no formulário seguro; endpoint local rejeita chamadas sem autenticação (401).
- [ ] Publicar esta versão e cadastrar confirmação pelo painel Pagamentos; orientação fornecida sem cadastro manual no Asaas. Tentativa autenticada na prévia bloqueada porque endereço externo ainda não serve o endpoint esperado. Nenhum webhook cadastrado até agora.
- [ ] Validar compra completa com Pix e cartão no Asaas, confirmação e financeiro; ainda não há nova cobrança testada. Cobranças reais dependem de aprovação da atividade e credenciais do ambiente ao vivo.
- [x] Revisar confirmação em checkout, retorno, histórico, painel, financeiro e webhook: sessões reutilizadas, retorno sem redirecionamento, consulta automática limitada, validação de valor e atualização de listas. Três testes passaram; pedido aprovado continua visível sem duplicar lançamento.
- [x] Corrigir retorno do pagamento com consulta autenticada à Stripe e validação de pedido/cliente/valor; saída da espera e recuperação ao acessar histórico. Dois testes passaram e pedido real de teste R$97,13 mostrou Pagamento aprovado na interface; preservar finalizados.
- [x] Instalar Stripe CLI e executar configuração de ferramentas do agente.
- [x] Revisar cobrança existente: total do pedido, cliente autenticado e confirmação assinada.
- [x] Gerar plano com stripe_implementation_planner após conectar Stripe própria; manter checkout incorporado.
- [x] Confirmar escolha pela conta Stripe própria usando chaves fornecidas de forma segura.
- [x] Conectar Stripe própria e adaptar cliente compartilhado e chave pública; preservar cálculo do pedido.
- [ ] Configurar confirmação assinada na conta própria; segredo de teste salvo com segurança e endpoint publicado acessível, mas leitura da conta Stripe conectada ainda retorna zero webhooks. Confirmar cadastro na mesma conta/ambiente e republicar para carregar segredo.
- [ ] Ativar cobranças reais na conta própria; aguarda credenciais ao vivo, verificação Stripe e teste completo.
- [x] Ativar Stripe (Pix QR + cartão), pedido confirmado automaticamente
- [x] Manter "dinheiro na entrega" com campo "troco para quanto"

## Delivery
- [x] Revisar compra, admin, pagamentos, WhatsApp, entregador, rastreamento e funções SQL; remover reutilização de cotação antiga sem alterar registros e manter cache de percursos por CEP. 21 testes passaram; Google Maps real segue pendente no publicado.
- [x] Corrigir cotação do cliente para distância baseada no CEP, mantendo número/complemento no pedido; 12 testes de entrega/cadastro passaram e prévia sem erros. Cálculo real do Google Maps ainda requer validação no site publicado autorizado.
- [x] Substituir endereços das lojas por CEP com consulta automática e WhatsApp por loja; preservar pedidos existentes. Oito testes passaram; consulta autenticada de CEP e campos verificados no celular.
- [x] Cadastrar duas origens com taxas separadas e selecionar o menor percurso no frete; preservar pedidos existentes. Nove testes passaram e painel verificado no celular/computador.
- [ ] Validar escolha da loja e frete no site publicado: depende dos dois endereços e tarifas reais; Google Maps não pode ser testado no ambiente do agente.
- [x] Remover endereço do cadastro e manter CEP, número e complemento na finalização.
- [x] Diagnosticar bloqueio: nenhuma configuração de delivery cadastrada. Consulta de CEP independente da ativação; cotação válida continua obrigatória para cobrar.
- [x] Verificar formulário no celular sem endereço/CEP e sete testes de cadastro/frete.
- [ ] Verificar busca CEP e cálculo autenticados na interface; precisa sessão do cliente na prévia, e origem/tarifas reais para cotação.
- [x] Criar cadastro de motoboys, atribuição de pedidos e área de entregas.
- [x] Adicionar acompanhamento do cliente, localização enquanto a página do motoboy estiver aberta e proteção por pedido.
- [x] Verificar atribuição, início, gravação de GPS, bloqueio de escrita pelo cliente, conclusão e interrupção de localização com contas temporárias; 10 testes passaram.
- [ ] Validar mapa e GPS no celular real no site publicado autorizado; Google Maps não pode ser verificado no ambiente de testes.
- [x] Adicionar configuração de origem, taxa base, valor por km, alcance e tempo de preparo no painel.
- [x] Implementar consulta CEP/endereço, distância por percurso e total com frete validado no pedido.
- [x] Verificar controles autenticados em celular/computador e testes de frete, total, alcance, CEP e prazo.
- [ ] Ativar com endereço e tarifas reais do administrador; salvar origem, consultar Google Maps e concluir pedido aguardam esses dados e teste no site publicado autorizado.