# Pagamentos com Mercado Pago

O projeto usa o Checkout Pro do Mercado Pago. O cliente é redirecionado para o ambiente seguro do Mercado Pago; o site não recebe nem armazena dados de cartão.

## Credenciais

Configure no ambiente protegido do projeto:

- `MP_ACCESS_TOKEN`: Access Token da aplicação no Mercado Pago.
- `MP_WEBHOOK_SECRET`: chave secreta criada em Webhooks para validar a assinatura `x-signature`.
- `APP_URL`: URL HTTPS pública do site quando o domínio final estiver definido.
- `MP_MODE=test` durante os testes; use `production` somente após validar a integração.

Nunca coloque esses valores em `index.html`, `app.js`, no repositório ou em mensagens de chat.

## Webhook

Depois que o site tiver uma URL HTTPS pública, configure no painel do Mercado Pago o evento **Pagamentos** para:

```text
https://SEU-DOMINIO/api/payments/webhook
```

O backend valida a assinatura HMAC, consulta o pagamento diretamente na API do Mercado Pago e só então atualiza o pedido no banco. O redirecionamento do cliente não é tratado como confirmação de pagamento.

## Rotas implementadas

- `POST /api/checkout/preferences`: valida itens e preços no servidor e cria a preferência.
- `GET /api/orders/:id`: consulta o status de um pedido.
- `POST /api/payments/webhook`: recebe e valida notificações de pagamento.
- `GET /api/health`: endpoint de disponibilidade do serviço.

Referências oficiais: [criar uma preferência](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/create-payment-preference), [notificações de pagamento](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications) e [visão geral do Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/overview).
