import { HomeClient } from "@/components/storefront/HomeClient";
import { getFeaturedProducts, getCategories, getProductsByCategory } from "@/lib/products";

export const revalidate = 0;

export default async function HomePage() {
  const [featuredProducts, categories, teaTableProducts] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
    getProductsByCategory("tea-table"),
  ]);
  return (
    <HomeClient
      featuredProducts={featuredProducts}
      categories={categories}
      teaTableProducts={teaTableProducts}
    />
  );
}
