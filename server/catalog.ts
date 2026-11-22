export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
};

export const catalog: CatalogItem[] = [
  { id: 'MA01', price: 39.90, name: 'Prato com borda verde', category: 'Mesa posta', image: 'prato', description: 'Louça com borda verde para compor a mesa com guardanapos de linho e peças em tons naturais.' },
  { id: 'MA02', price: 29.90, name: 'Taça canelada', category: 'Mesa posta', image: 'taca', description: 'Taça de vidro com textura em relevo para servir água, sucos e outras bebidas.' },
  { id: 'MA03', price: 34.90, name: 'Xícara com pires', category: 'Mesa posta', image: 'cafe', description: 'Peças em tons suaves para servir café, chá ou montar um cantinho do café.' },
  { id: 'MA04', price: 49.90, name: 'Utensílios de madeira', category: 'Cozinha', image: 'utensilios', description: 'Colheres e espátulas para misturar, cozinhar e servir. Consulte as opções de peças.' },
  { id: 'MA05', price: 59.90, name: 'Petisqueira de madeira', category: 'Cozinha', image: 'madeira', description: 'Bandeja com divisórias para servir castanhas, queijos, azeitonas ou outros aperitivos.' },
  { id: 'MA06', price: 79.90, name: 'Vaso decorativo canelado', category: 'Decoração', image: 'vaso', description: 'Vaso claro com textura vertical para compor aparadores, prateleiras ou centros de mesa.' },
  { id: 'MA07', price: 24.90, name: 'Enfeites natalinos', category: 'Natal', image: 'natal', description: 'Detalhes dourados para compor a árvore e decorar a casa no Natal.' },
  { id: 'NT01', price: 69.90, name: 'Papai Noel decorativo', category: 'Natal', image: 'natal-noel', description: 'Figura de Papai Noel em vermelho e branco para decorar aparadores, estantes e cantinhos da casa.' },
  { id: 'NT02', price: 249.90, name: 'Árvore de Natal', category: 'Natal', image: 'natal-arvore', description: 'Árvore verde para montar e decorar com suas luzes e enfeites favoritos.' },
  { id: 'NT03', price: 34.90, name: 'Taça vermelha de Natal', category: 'Natal', image: 'natal-taca', description: 'Taça com textura em relevo e tom vermelho para compor a mesa da ceia.' },
  { id: 'NT04', price: 44.90, name: 'Prato com folhagens natalinas', category: 'Natal', image: 'natal-prato', description: 'Prato claro com borda verde e folhagens decorativas para a mesa posta de Natal.' },
  { id: 'NT05', price: 29.90, name: 'Estrela dourada para árvore', category: 'Natal', image: 'natal-estrela', description: 'Ponteira em formato de estrela para finalizar a decoração da árvore de Natal.' },
  { id: 'NT06', price: 39.90, name: 'Pisca-pisca de luz quente', category: 'Natal', image: 'natal-luzes', description: 'Cordão de luzes quentes para decorar árvores e arranjos.' },
  { id: 'NT07', price: 89.90, name: 'Guirlanda com laço vermelho', category: 'Natal', image: 'natal-guirlanda', description: 'Guirlanda verde com frutos vermelhos e laço para portas e paredes.' },
  { id: 'NT08', price: 34.90, name: 'Kit de bolas natalinas', category: 'Natal', image: 'natal-bolas', description: 'Seleção de bolas vermelhas e douradas para combinar com folhagens e luzes.' },
  { id: 'NT09', price: 54.90, name: 'Caminho de mesa natalino', category: 'Natal', image: 'natal-caminho', description: 'Caminho de mesa em verde e vermelho com detalhes de folhagens para a ceia.' }
];

export const catalogById = new Map(catalog.map((item) => [item.id, item]));
