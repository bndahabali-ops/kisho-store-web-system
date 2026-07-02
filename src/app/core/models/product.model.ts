// ============================================================
// Agent 3 — TypeScript Interfaces matching the backend schema
// ============================================================

export const SIZES = ['Small', 'Medium', 'Large', 'X-Large', 'XX-Large', 'Free Size'] as const;
export type Size = typeof SIZES[number];

export interface ColorOption {
  name: string;
  images: string[];
}

export interface Variant {
  color: string;
  size: Size;
  stock: number;
}

export interface ProductOptions {
  colors: ColorOption[];
}

export interface Product {
  _id: string;
  title: string;
  description: string;
  basePrice: number;
  discountPrice: number;
  category: string;
  options: ProductOptions;
  variants: Variant[];
  isActive: boolean;
  isNewArrival: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  status: string;
  message: string;
  data: {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SingleProductResponse {
  status: string;
  message: string;
  data: { product: Product };
}

export interface CreateProductPayload {
  title: string;
  description: string;
  basePrice: number;
  discountPrice?: number;
  category: string;
  options: ProductOptions;
  variants: Variant[];
  isActive?: boolean;
  isNewArrival?: boolean;
}
