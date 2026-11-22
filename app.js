const whatsappNumber = '5598984932758';
let products = [
  {id:'MA01',price:39.90,name:'Prato com borda verde',category:'Mesa posta',image:'prato',description:'Louça com borda verde para compor a mesa com guardanapos de linho e peças em tons naturais.'},
  {id:'MA02',price:29.90,name:'Taça canelada',category:'Mesa posta',image:'taca',description:'Taça de vidro com textura em relevo para servir água, sucos e outras bebidas.'},
  {id:'MA03',price:34.90,name:'Xícara com pires',category:'Mesa posta',image:'cafe',description:'Peças em tons suaves para servir café, chá ou montar um cantinho do café.'},
  {id:'MA04',price:49.90,name:'Utensílios de madeira',category:'Cozinha',image:'utensilios',description:'Colheres e espátulas para misturar, cozinhar e servir. Consulte as opções de peças.'},
  {id:'MA05',price:59.90,name:'Petisqueira de madeira',category:'Cozinha',image:'madeira',description:'Bandeja com divisórias para servir castanhas, queijos, azeitonas ou outros aperitivos.'},
  {id:'MA06',price:79.90,name:'Vaso decorativo canelado',category:'Decoração',image:'vaso',description:'Vaso claro com textura vertical para compor aparadores, prateleiras ou centros de mesa.'},
  {id:'MA07',price:24.90,name:'Enfeites natalinos',category:'Natal',image:'natal',description:'Detalhes dourados para compor a árvore e decorar a casa no Natal.'},
  {id:'NT01',price:69.90,name:'Papai Noel decorativo',category:'Natal',image:'natal-noel',description:'Figura de Papai Noel em vermelho e branco para decorar aparadores, estantes e cantinhos da casa.'},
  {id:'NT02',price:249.90,name:'Árvore de Natal',category:'Natal',image:'natal-arvore',description:'Árvore verde para montar e decorar com suas luzes e enfeites favoritos. Consulte tamanhos e itens inclusos.'},
  {id:'NT03',price:34.90,name:'Taça vermelha de Natal',category:'Natal',image:'natal-taca',description:'Taça com textura em relevo e tom vermelho para compor a mesa da ceia. Preço ilustrativo por unidade.'},
  {id:'NT04',price:44.90,name:'Prato com folhagens natalinas',category:'Natal',image:'natal-prato',description:'Prato claro com borda verde e folhagens decorativas, pensado para a mesa posta de Natal.'},
  {id:'NT05',price:29.90,name:'Estrela dourada para árvore',category:'Natal',image:'natal-estrela',description:'Ponteira em formato de estrela para finalizar a decoração da árvore de Natal.'},
  {id:'NT06',price:39.90,name:'Pisca-pisca de luz quente',category:'Natal',image:'natal-luzes',description:'Cordão de luzes quentes para decorar árvores e arranjos. Consulte comprimento, alimentação e condições de uso.'},
  {id:'NT07',price:89.90,name:'Guirlanda com laço vermelho',category:'Natal',image:'natal-guirlanda',description:'Guirlanda verde com frutos vermelhos e laço para compor a decoração de portas e paredes.'},
  {id:'NT08',price:34.90,name:'Kit de bolas natalinas',category:'Natal',image:'natal-bolas',description:'Seleção de bolas vermelhas e douradas para combinar com folhagens e luzes na árvore.'},
  {id:'NT09',price:54.90,name:'Caminho de mesa natalino',category:'Natal',image:'natal-caminho',description:'Caminho de mesa em verde e vermelho com detalhes de folhagens para a ceia.'}
];
const categories = ['Todos','Mesa posta','Cozinha','Decoração'];
const filters = document.querySelector('.filters');
const grid = document.querySelector('.catalog .grid');
const count = document.querySelector('.count');
const search = document.querySelector('#search');
const dialog = document.querySelector('#product-dialog');
const order = document.querySelector('#product-dialog .order');
const showOrder = document.querySelector('.show-order');
const productActions = document.querySelector('.product-actions');
const cartDialog = document.querySelector('#cart-dialog');
const cartButton = document.querySelector('.cart-toggle');
const cartItems = document.querySelector('.cart-items');
const cartForm = document.querySelector('.cart-order');
const checkoutCart = document.querySelector('.checkout-cart');
const paymentButton = document.querySelector('.payment-btn');
const paymentFeedback = document.querySelector('.payment-feedback');
const cartStorageKey = 'casas-angra-cart';
const maxQuantity = 999;
const currency = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
const imageSrc = image => /^https:\/\//i.test(image) ? image : `/img/${image}.webp`;
let category = 'Todos';
let selected;
let opener;
let directPurchase = false;
let feedbackTimer;
let cart = readCart();

for(const name of categories){
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'filter'; button.textContent = name;
  button.addEventListener('click',()=>{category=name;render();});
  filters.append(button);
}
function render(){
  const terms = normalize(search.value).split(/\s+/).filter(Boolean);
  const visible = products.filter(product=>{
    const content=normalize([product.name,product.category,product.description].join(' '));
    return (category==='Todos'||category===product.category) && (terms.length>0||product.category!=='Natal') && terms.every(term=>content.includes(term));
  });
  for(const button of filters.children) button.setAttribute('aria-pressed',String(button.textContent===category));
  count.textContent = `${visible.length} ${visible.length===1?'item':'itens'} · Catálogo ilustrativo`;
  grid.replaceChildren();
  if(!visible.length){
    const empty=document.createElement('div'); empty.className='empty';
    empty.innerHTML='<p>Nenhum item encontrado. Tente outro termo ou veja todas as categorias.</p><button class="btn" type="button">Limpar pesquisa</button>';
    empty.querySelector('button').addEventListener('click',()=>{search.value='';category='Todos';render();search.focus();});
    grid.append(empty); return;
  }
  visible.forEach((product,index)=>grid.append(createProductCard(product,index)));
}
function createProductCard(product,index){
  const card=document.createElement('article'); card.className='card'; card.style.animationDelay=`${Math.min(index,5)*42}ms`;
  card.innerHTML=`<button class="product-link" type="button" aria-haspopup="dialog"><span class="product-img"><img loading="lazy" src="${imageSrc(product.image)}" alt="${product.name}"></span><span class="details"><span class="product-name">${product.name}</span><strong class="product-price">${currency.format(product.price)}</strong></span></button>`;
  const button=card.querySelector('button');
  button.addEventListener('click',()=>{
    selected=product; opener=button; order.reset(); order.hidden=true; productActions.hidden=false; directPurchase=false;
    order.querySelector('button[type="submit"]').textContent='Continuar no WhatsApp';
    document.querySelector('#order-image').src=imageSrc(product.image);
    document.querySelector('#order-image').alt=product.name;
    document.querySelector('#order-title').textContent=product.name;
    document.querySelector('#order-price').textContent=currency.format(product.price);
    document.querySelector('#order-desc').textContent=product.description;
    order.elements.nome.setCustomValidity('');
    dialog.showModal(); document.querySelector('#order-title').focus();
  });
  return card;
}
search.addEventListener('input',()=>{category='Todos';render();if(search.value.trim())document.querySelector('#catalogo').scrollIntoView({behavior:'smooth'});});
document.querySelector('.search').addEventListener('submit',event=>{event.preventDefault();document.querySelector('#catalogo').scrollIntoView({behavior:'smooth'});});
function openProductOrder(buyNow){directPurchase=buyNow;productActions.hidden=true;order.hidden=false;order.querySelector('button[type="submit"]').textContent=buyNow?'Enviar pedido pelo WhatsApp':'Continuar no WhatsApp';order.elements.nome.focus();}
showOrder.addEventListener('click',()=>openProductOrder(false));
document.querySelector('.buy-now').addEventListener('click',()=>openProductOrder(true));
document.querySelector('.add-cart').addEventListener('click',()=>{const current=cart.get(selected.id)||0;const updated=setQuantity(selected.id,current+1);const feedback=document.querySelector('.cart-feedback');feedback.textContent=updated?`${selected.name} adicionado ao carrinho.`:'Quantidade máxima por produto atingida.';clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>feedback.textContent='',3000);dialog.close();});
document.querySelector('#product-dialog .close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
dialog.addEventListener('close',()=>opener?.focus());
order.elements.nome.addEventListener('input',()=>order.elements.nome.setCustomValidity(''));
order.addEventListener('submit',event=>{event.preventDefault();const name=order.elements.nome.value.trim();if(!name){order.elements.nome.setCustomValidity('Informe seu nome.');order.elements.nome.reportValidity();return;}const city=order.elements.cidade.value.trim();const message=[`Olá, Casas Angra! Meu nome é ${name}${directPurchase?'. Quero fazer este pedido pelo site:':'. Vi este item no catálogo do site:'}`,'',`Produto: ${selected.name} (${selected.id})`,`Quantidade: ${order.elements.quantidade.value}`,...(city?[`Cidade: ${city}`]:[]),'',directPurchase?'Podem confirmar o valor, a disponibilidade e as opções de pagamento?':'Podem me informar o valor e a disponibilidade?'].join('\n');openWhatsApp(message);dialog.close();});
function openWhatsApp(message){window.location.assign(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);}
function readCart(){try{const saved=JSON.parse(localStorage.getItem(cartStorageKey))||{};return new Map(products.filter(({id})=>Number.isInteger(saved[id])&&saved[id]>0&&saved[id]<=maxQuantity).map(({id})=>[id,saved[id]]));}catch{return new Map();}}
function setQuantity(id,quantity){if(quantity>maxQuantity)return false;if(quantity>0)cart.set(id,quantity);else cart.delete(id);try{localStorage.setItem(cartStorageKey,JSON.stringify(Object.fromEntries(cart)));}catch{}renderCart();return true;}
function renderCart(){const quantity=[...cart.values()].reduce((total,value)=>total+value,0);cartButton.querySelector('.cart-count').textContent=quantity;cartItems.replaceChildren();let subtotalCents=0;for(const product of products){const units=cart.get(product.id);if(!units)continue;const lineCents=Math.round(product.price*100)*units;subtotalCents+=lineCents;const item=document.createElement('li');item.dataset.product=product.id;item.innerHTML=`<img src="${imageSrc(product.image)}" alt=""><div><strong>${product.name}</strong><div>${currency.format(lineCents/100)}</div><div class="cart-controls"><button type="button" data-change="-1" aria-label="Diminuir quantidade de ${product.name}" ${units===1?'disabled':''}>−</button><span aria-label="Quantidade">${units}</span><button type="button" data-change="1" aria-label="Aumentar quantidade de ${product.name}" ${units===maxQuantity?'disabled':''}>+</button><button type="button" data-change="remove" aria-label="Remover ${product.name}">Remover</button></div></div>`;cartItems.append(item);}cartDialog.querySelector('.cart-total').textContent=currency.format(subtotalCents/100);cartDialog.querySelector('.empty-cart').hidden=quantity>0;for(const selector of ['.cart-summary','.cart-note'])cartDialog.querySelector(selector).hidden=!quantity;if(!quantity)cartForm.hidden=true;checkoutCart.hidden=!quantity||!cartForm.hidden;}
cartItems.addEventListener('click',event=>{const button=event.target.closest('[data-change]');if(!button)return;const id=button.closest('li').dataset.product;const change=button.dataset.change;setQuantity(id,change==='remove'?0:cart.get(id)+Number(change));const replacement=cartItems.querySelector(`[data-product="${id}"] [data-change="${change}"]:enabled`);(replacement||cartItems.querySelector('button:enabled')||cartDialog.querySelector('.keep-shopping')).focus();});
cartButton.addEventListener('click',()=>{cartForm.hidden=true;renderCart();cartDialog.showModal();cartDialog.querySelector('h2').focus();});
for(const selector of ['.close','.keep-shopping'])cartDialog.querySelector(selector).addEventListener('click',()=>cartDialog.close());
checkoutCart.addEventListener('click',()=>{checkoutCart.hidden=true;cartForm.hidden=false;cartForm.elements.nome.focus();});
paymentButton.addEventListener('click',async()=>{
  if(!cart.size)return;
  const name=cartForm.elements.nome.value.trim();
  if(!name){cartForm.elements.nome.setCustomValidity('Informe seu nome.');cartForm.elements.nome.reportValidity();return;}
  cartForm.elements.nome.setCustomValidity('');
  paymentButton.disabled=true;
  paymentFeedback.textContent='Abrindo o checkout seguro…';
  try{
    const response=await fetch('/api/checkout/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer:{name,city:cartForm.elements.cidade.value.trim()},items:[...cart.entries()].map(([id,quantity])=>({id,quantity}))})});
    const data=await response.json();
    if(!response.ok||!data.checkoutUrl)throw new Error(data.error||'Não foi possível iniciar o pagamento.');
    window.location.assign(data.checkoutUrl);
  }catch(error){paymentFeedback.textContent=error instanceof Error?error.message:'Não foi possível iniciar o pagamento.';paymentButton.disabled=false;}
});
cartForm.elements.nome.addEventListener('input',()=>cartForm.elements.nome.setCustomValidity(''));
cartForm.addEventListener('submit',event=>{event.preventDefault();if(!cart.size)return;const name=cartForm.elements.nome.value.trim();if(!name){cartForm.elements.nome.setCustomValidity('Informe seu nome.');cartForm.elements.nome.reportValidity();return;}const city=cartForm.elements.cidade.value.trim();const lines=products.filter(product=>cart.has(product.id)).map(product=>`${cart.get(product.id)}× ${product.name} (${product.id})`);openWhatsApp(['Olá, Casas Angra! Meu nome é '+name+'. Quero fazer este pedido pelo site:','',...lines,...(city?['',`Cidade: ${city}`]:[]),'','Podem confirmar os valores, a disponibilidade e as opções de pagamento?'].join('\n'));});
async function startCatalog(){
  try{
    const response=await fetch('/api/products');
    const remote=await response.json();
    if(response.ok&&Array.isArray(remote)&&remote.length){products=remote;cart=readCart();}
  }catch{}
  products.filter(product=>product.category==='Natal').forEach((product,index)=>document.querySelector('.holiday-grid').append(createProductCard(product,index)));
  renderCart();render();
  const paymentState=new URLSearchParams(location.search).get('payment');
  if(paymentState){
    const messages={success:'Pagamento aprovado. Obrigado pelo pedido!',pending:'Pagamento pendente. A loja confirmará a atualização em breve.',failure:'O pagamento não foi concluído. Você pode tentar novamente.'};
    const feedback=document.querySelector('.cart-feedback');feedback.textContent=messages[paymentState]||'';
    if(feedback.textContent)setTimeout(()=>feedback.textContent='',6000);
    history.replaceState({},'',location.pathname);
  }
}
startCatalog();
