// ============================================================
// Agent 3 — Product Service
// Full CRUD — typed responses — matches backend route map exactly
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Product,
  ProductsResponse,
  SingleProductResponse,
  CreateProductPayload,
} from '../models/product.model';

const API = '/api';

export interface GetProductsParams {
  page?:     number;
  limit?:    number;
  category?: string;
  isActive?: boolean;
  search?:   string;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}

  // ── GET /api/admin/products ───────────────────────────────────────────
  // Admin endpoint — returns ALL products (active + inactive)
  // JWT is auto-attached by AuthInterceptor
  getAll(params: GetProductsParams = {}): Observable<ProductsResponse> {
    let httpParams = new HttpParams();
    if (params.page  != null) httpParams = httpParams.set('page',     params.page.toString());
    if (params.limit != null) httpParams = httpParams.set('limit',    params.limit.toString());
    if (params.category)            httpParams = httpParams.set('category', params.category);
    if (params.isActive != null)    httpParams = httpParams.set('isActive',  String(params.isActive));
    if (params.search?.trim())      httpParams = httpParams.set('search',   params.search.trim());
    if (params.minPrice != null)    httpParams = httpParams.set('minPrice', String(params.minPrice));
    if (params.maxPrice != null)    httpParams = httpParams.set('maxPrice', String(params.maxPrice));
    return this.http.get<ProductsResponse>(`${API}/admin/products`, { params: httpParams });
  }

  // ── GET /api/products/:id ─────────────────────────────────────────────────
  getById(id: string): Observable<SingleProductResponse> {
    return this.http.get<SingleProductResponse>(`${API}/products/${id}`);
  }

  // ── POST /api/admin/products (JWT required — interceptor attaches it) ─────
  create(payload: CreateProductPayload): Observable<SingleProductResponse> {
    return this.http.post<SingleProductResponse>(`${API}/admin/products`, payload);
  }

  // ── PATCH /api/admin/products/:id ─────────────────────────────────────────
  update(id: string, payload: Partial<CreateProductPayload>): Observable<SingleProductResponse> {
    return this.http.patch<SingleProductResponse>(`${API}/admin/products/${id}`, payload);
  }

  // ── DELETE /api/admin/products/:id ────────────────────────────────────────
  delete(id: string): Observable<{ status: string; message: string; data: null }> {
    return this.http.delete<{ status: string; message: string; data: null }>(
      `${API}/admin/products/${id}`
    );
  }

  // ── Toggle isActive ───────────────────────────────────────────────────────
  toggleActive(product: Product): Observable<SingleProductResponse> {
    return this.update(product._id, { isActive: !product.isActive });
  }
}
