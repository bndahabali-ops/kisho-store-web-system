// category.service.ts — Admin-side category API service
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  image: string;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListResponse {
  status: string;
  message: string;
  data: { categories: Category[] };
}

export interface CategoryResponse {
  status: string;
  message: string;
  data: { category: Category };
}

export interface ImageUploadResponse {
  status: string;
  message: string;
  url: string;
}

const API = '/api';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private adminUrl = `${API}/admin/categories`;

  constructor(private http: HttpClient) {}

  /** GET /api/admin/categories — fetch all (including hidden) for admin */
  getAll(): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(this.adminUrl, { withCredentials: true });
  }

  /** POST /api/admin/categories — create new category */
  create(payload: { name: string; image?: string; isVisible: boolean; sortOrder?: number }): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(this.adminUrl, payload, { withCredentials: true });
  }

  /** PUT /api/admin/categories/:id — update any field including isVisible */
  update(id: string, patch: Partial<{ name: string; image: string; isVisible: boolean; sortOrder: number }>): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`${this.adminUrl}/${id}`, patch, { withCredentials: true });
  }

  /** DELETE /api/admin/categories/:id */
  remove(id: string): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(`${this.adminUrl}/${id}`, { withCredentials: true });
  }

  /** POST /api/admin/categories/upload-image — uploads image, returns Cloudinary URL */
  uploadImage(file: File): Observable<ImageUploadResponse> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<ImageUploadResponse>(`${this.adminUrl}/upload-image`, form, { withCredentials: true });
  }
}
