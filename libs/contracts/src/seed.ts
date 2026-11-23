export const seedProducts = [
  { sku: 'mug', name: 'Ceramic mug', price: 1299 },
  { sku: 'notebook', name: 'Notebook', price: 1899 },
  { sku: 'pen', name: 'Pen', price: 499 },
] as const;

export type SeedProduct = (typeof seedProducts)[number];
