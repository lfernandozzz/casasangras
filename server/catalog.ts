export type CatalogItem = {
  id: string;
  name: string;
  price: number;
};

export const catalog: CatalogItem[] = [
  { id: 'MA01', name: 'Prato com borda verde', price: 39.90 },
  { id: 'MA02', name: 'Taça canelada', price: 29.90 },
  { id: 'MA03', name: 'Xícara com pires', price: 34.90 },
  { id: 'MA04', name: 'Utensílios de madeira', price: 49.90 },
  { id: 'MA05', name: 'Petisqueira de madeira', price: 59.90 },
  { id: 'MA06', name: 'Vaso decorativo canelado', price: 79.90 },
  { id: 'MA07', name: 'Enfeites natalinos', price: 24.90 },
  { id: 'NT01', name: 'Papai Noel decorativo', price: 69.90 },
  { id: 'NT02', name: 'Árvore de Natal', price: 249.90 },
  { id: 'NT03', name: 'Taça vermelha de Natal', price: 34.90 },
  { id: 'NT04', name: 'Prato com folhagens natalinas', price: 44.90 },
  { id: 'NT05', name: 'Estrela dourada para árvore', price: 29.90 },
  { id: 'NT06', name: 'Pisca-pisca de luz quente', price: 39.90 },
  { id: 'NT07', name: 'Guirlanda com laço vermelho', price: 89.90 },
  { id: 'NT08', name: 'Kit de bolas natalinas', price: 34.90 },
  { id: 'NT09', name: 'Caminho de mesa natalino', price: 54.90 }
];

export const catalogById = new Map(catalog.map((item) => [item.id, item]));
