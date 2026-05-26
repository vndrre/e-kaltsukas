export type ProductItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  category?: string;
};

export type RecommendedItem = ProductItem & {
  category: string;
};
