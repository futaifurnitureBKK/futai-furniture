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

export type LeadChannel = "facebook" | "shopee" | "tiktok" | "line" | "other";
export type LeadSegment = "b2b" | "b2c";
export type LeadStatus =
  | "new"
  | "followed_1"
  | "followed_2plus"
  | "engaged"
  | "quoted"
  | "converted"
  | "lost";
export type LeadContactMethod = "line" | "phone" | "email" | "messenger";

export interface Lead {
  id: number;
  lead_date: string;
  customer_name: string;
  channel: LeadChannel;
  segment: LeadSegment;
  sku: string | null;
  status: LeadStatus;
  contact_method: LeadContactMethod | null;
  notes: string;
  next_followup_date: string | null;
  deal_value: number | null;
  lost_reason: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SavedQuoteDocType = "quotation" | "invoice";
export type SavedQuoteLangMode = "th-en-zh" | "th-en" | "th-zh";
export type SavedQuoteStatus = "pending" | "in_progress" | "confirmed" | "completed";
export type SavedQuoteChannel = "facebook" | "shopee" | "tiktok" | "other";

export interface SavedQuoteItem {
  name: string;
  sku: string;
  size: string;
  qty: number;
  unitPrice: number;
  remark: string;
  image: string | null;
}

export interface SavedQuote {
  id: number;
  doc_type: SavedQuoteDocType;
  doc_no: string;
  status: SavedQuoteStatus;
  channel: SavedQuoteChannel;
  lang_mode: SavedQuoteLangMode;
  doc_date: string;
  customer_name: string;
  customer_address: string;
  customer_tax_id: string;
  shipping_address: string;
  shipping_date: string | null;
  contact_person: string;
  contact_phone: string;
  discount_pct: number;
  vat_pct: number;
  deposit_pct: number;
  items: SavedQuoteItem[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  name_zh: string;
  banner_url: string;
  description_th: string;
  description_en: string;
  description_zh: string;
  sort_order: number;
  product_count?: number;
}

export interface ColorVariant {
  label_th: string;
  label_en: string;
  label_zh: string;
  hex: string;
  images: string[];
}

export interface Product {
  id: string;
  sku: string;
  name_th: string;
  name_en: string;
  name_zh: string;
  category_id: string;
  category_slug: string;
  description_th: string;
  description_en: string;
  description_zh: string;
  dimensions: string;
  price: number | null;
  stock_status: StockStatus;
  images: string[];
  tags: string[];
  color_variants?: ColorVariant[];
  is_featured: boolean;
  is_active: boolean;
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
  product_sku: string;
  product_name_snapshot: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  line_id: string;
  quantity: number;
  message: string;
  status: QuoteStatus;
  created_at: string;
}

export interface CartItemColor {
  label_th: string;
  label_en: string;
  label_zh: string;
  hex: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  color?: CartItemColor;
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
