export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProductCategory = "Workwear" | "Evening" | "Deel" | "Corporate";
export type OrderStatus = "INITIAL_RECEIVED" | "IN_PRODUCTION" | "QC_PASSED" | "DELIVERED";
export type GarmentView = "suit" | "jacket" | "pants";
export type Measurements = Partial<Record<"height" | "chest" | "waist" | "hip" | "sleeve", number>>;

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price_mnt: number;
  fabric: string;
  tags: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  order_number: number;
  submission_id: string;
  customer_name: string;
  phone: string;
  company: string;
  product_id: string;
  product_name_snapshot: string;
  product_category_snapshot: ProductCategory;
  unit_price_mnt: number;
  quantity: number;
  total_mnt: number;
  fabric_ratio: "65/35" | "20/80";
  swatch_code: number;
  accent_swatch_code: number;
  size: string;
  measurements: Measurements;
  garment_view: GarmentView;
  back_view: boolean;
  reflective_tape: boolean;
  reflective_color: string;
  logo_text: string;
  lux: number;
  status: OrderStatus;
  created_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      products: Table<
        Product,
        Omit<Product, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string },
        Partial<Omit<Product, "id" | "created_at" | "updated_at">>
      >;
      orders: Table<
        Order,
        Omit<Order, "id" | "order_number" | "status" | "created_at"> & {
          id?: string;
          status?: OrderStatus;
          created_at?: string;
        },
        Partial<Pick<Order, "status">>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      product_category: ProductCategory;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
