export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
};

export const products: Product[] = [
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    title: "ProductOne",
    description: "Short Product Description1",
    price: 24,
    count: 1,
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
    title: "ProductTitle",
    description: "Short Product Description7",
    price: 15,
    count: 2,
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3",
    title: "Product",
    description: "Short Product Description2",
    price: 23,
    count: 3,
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73348a80a1",
    title: "ProductTest",
    description: "Short Product Description4",
    price: 15,
    count: 4,
  },
  {
    id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2",
    title: "Product2",
    description: "Short Product Description1",
    price: 23,
    count: 5,
  },
  {
    id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1",
    title: "ProductName",
    description: "Short Product Description7",
    price: 15,
    count: 6,
  },
];
