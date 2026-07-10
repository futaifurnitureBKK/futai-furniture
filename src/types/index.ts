export type StockStatus = "in_stock" | "out_of_stock" | "on_order";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";
export type QuoteStatus = "pending" | "quoted" | "converted" | "archived";
export type DeliveryMethod = "pickup" | "delivery";

export interface Category {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  banner_url: string;
  description_th: string;
  description_en: string;
  sort_order: number;
  product_count?: number;
}

export interface Product {
  id: string;
  sku: string;
  name_th: string;
  name_en: string;
  category_id: string;
  category_slug: string;
  description_th: string;
  description_en: string;
  dimensions: string;
  price: number | null;
  stock_status: StockStatus;
  images: string[];
  tags: string[];
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  line_id: string;
  address: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku: string;
  name_snapshot: string;
  quantity: number;
  price_snapshot: number | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer?: Customer;
  items?: OrderItem[];
  status: OrderStatus;
  total: number | null;
  delivery_method: DeliveryMethod;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteRequest {
  id: string;
  product_id: string;
  product?: Product;
  customer_info: {
    name: string;
    company: string;
    phone: string;
    email: string;
    line_id: string;
  };
  quantity: number;
  message: string;
  status: QuoteStatus;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface QuoteFormValues {
  name: string;
  company: string;
  phone: string;
  email: string;
  line_id: string;
  quantity: number;
  message: string;
}

export interface CheckoutFormValues {
  name: string;
  company: string;
  phone: string;
  email: string;
  line_id: string;
  address: string;
  delivery_method: DeliveryMethod;
  notes: string;
}
