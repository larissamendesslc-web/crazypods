# CRAZY ORDERS 1.0 — DEMONSTRAÇÃO LOCAL ISOLADA

Este diretório é **uma implementação nova** e não uma recuperação dos arquivos locais do Work anterior. O ambiente reproduz o fluxo com produtos inventados e pagamentos, estoque e valores inteiramente fictícios.

## Objetivo e limites

- Carrinho de produtos de papelaria fictícios, formulário de dados **fictícios** e criação de identificador `DEMO-*`.
- Frete definido manualmente no painel de demonstração; reajuste invalida o aceite anterior.
- Aceite do orçamento, pagamento simulado e conclusão administrativa.
- Controle idempotente de estoque e lançamentos financeiros em memória, mais cancelamento e estorno simulado.
- Interface Black Volt 2.0 responsiva, separada do catálogo verdadeiro.
- Zero integração com WhatsApp, Pix, Supabase, banco da loja ou dinheiro real.
- Dados vivem **somente na memória da aba**; recarregar apaga a simulação. Não coloque dados pessoais reais.

O link compartilhável de pedido entre aparelhos e a persistência segura exigiriam backend remoto separado, autenticação, políticas RLS e testes de concorrência. Eles **não estão implementados**, assim como não há transações reais em PostgreSQL. Este protótipo não deve ser confundido com um sistema de produção.

## Executar localmente

```bash
node --test logic.test.mjs
python -m http.server 8080
```

Abra `http://localhost:8080` no navegador. Sem `python`, use qualquer servidor HTTP estático.

## No site Crazy Pods

Uma etapa de build copia os arquivos para `public/crazy-orders-demo/`. A rota está separada, não foi integrada ao carrinho real e não divulga pedidos reais. Acompanhe exclusivamente previews de branch. Não publique o módulo em produção sem autorização explícita.

## Próximas etapas para produtos permitidos

1. Obter os arquivos originais do Work se ainda estiverem disponíveis; comparar antes de sobrescrever qualquer desenvolvimento.
2. Criar projeto Supabase **exclusivo de testes** e definir migrações sem tocar na base da loja.
3. Implementar backend com tokens aleatórios de consulta, criptografia, autenticação de administradores, privacidade e RLS.
4. Adicionar transações concorrentes e idempotência no PostgreSQL com testes reais.
5. Só então gerar link compartilhável de verdade, após a devida verificação jurídica e de privacidade.
