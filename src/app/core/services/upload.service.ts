// ============================================================
// Upload Service — sends images to POST /api/admin/products/upload
// Returns Cloudinary secure URLs
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadResponse {
  status: string;
  message: string;
  urls: string[];
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private http: HttpClient) {}

  /**
   * Upload multiple image files for a single colour.
   * The JWT is auto-attached by AuthInterceptor.
   * Returns Cloudinary secure URLs.
   */
  uploadImages(files: File[]): Observable<UploadResponse> {
    const fd = new FormData();
    files.forEach(f => fd.append('images', f, f.name));
    // POST /api/admin/products/upload (proxy forwards to localhost:3001)
    return this.http.post<UploadResponse>('/api/admin/products/upload', fd);
  }
}
