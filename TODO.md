# Entregas

## Página principal e identidade visual
- [x] A página inicial apresenta banner de Natal, chamada principal e navegação para catálogo e loja física.
- [x] A identidade visual usa verde floresta, cranberry, dourado, tipografia editorial e layout responsivo.

## Catálogo e descoberta
- [x] O catálogo exibe produtos de mesa posta, cozinha e decoração em cards responsivos.
- [x] A busca textual consulta nome, categoria e descrição.
- [x] Os filtros permitem alternar entre Todos, Mesa posta, Cozinha e Decoração.
- [x] Cada card abre os detalhes do produto com imagem, nome e preço ilustrativo.

## Carrinho e contato
- [x] O modal de produto oferece consulta pelo WhatsApp, compra imediata e adição ao carrinho.
- [x] O carrinho persiste no navegador e permite adicionar, remover e alterar quantidades.
- [x] O subtotal estimado e os formulários de nome, cidade e quantidade são exibidos quando aplicável.
- [x] Os pedidos geram mensagens personalizadas para o WhatsApp da loja.

## Natal e loja física
- [x] A seção especial de Natal exibe produtos temáticos.
- [x] A seção da loja informa endereço, oferece rota no Google Maps e links para Instagram e WhatsApp.
- [x] O botão flutuante de WhatsApp permanece disponível na página.

## Pagamentos e segurança
- [x] O frontend envia somente IDs e quantidades; o backend recalcula preços a partir do catálogo confiável.
- [x] O backend TypeScript cria pedidos persistentes no banco gerenciado e gera preferências do Checkout Pro.
- [x] O Webhook valida a assinatura HMAC do Mercado Pago e consulta o pagamento antes de atualizar o pedido.
- [x] As credenciais protegidas do Mercado Pago e do painel foram configuradas no ambiente, sem serem gravadas no código; o health check confirma `payment: true` e `admin: true`.
- [ ] Confirmar no painel do Mercado Pago a URL HTTPS pública `https://casasangra-te4foniu.manus.space/api/payments/webhook`, com o evento de pagamentos habilitado, e validar a primeira notificação real.

## Painel administrativo e operação
- [x] `/admin` oferece login por senha, sessão HttpOnly com cookie compatível com o Preview HTTPS e proteção das APIs administrativas.
- [x] O painel permite cadastrar, editar e ativar/desativar produtos sem editar o código; o catálogo público carrega apenas produtos ativos do banco.
- [x] A central de pedidos lista pedidos e permite filtrar e atualizar status de pagamento e entrega (`waiting`, `preparing`, `ready`, `delivered` e `cancelled`).
- [x] A imagem de publicação inclui os arquivos do painel, o manifesto declara `/admin` e o build do backend passou sem erros.
