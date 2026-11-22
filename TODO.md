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
- [ ] Configurar as credenciais protegidas do Mercado Pago e a URL HTTPS pública do Webhook.
