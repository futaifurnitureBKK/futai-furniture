import { HomeClient } from "@/components/storefront/HomeClient";
import { getFeaturedProducts, getCategories } from "@/lib/products";

export const revalidate = 0;

export default async function HomePage() {
  const [featuredProducts, categories] = await Promise.all([getFeaturedProducts(8), getCategories()]);
  return <HomeClient featuredProducts={featuredProducts} categories={categories} />;
}
