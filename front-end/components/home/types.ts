export type ProductItem = {
  id: string;
  name: string;
  price: string;
  image: string;
};

export type RecommendedItem = ProductItem & {
  category: string;
};
