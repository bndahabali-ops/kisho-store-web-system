import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = '/api';

export interface Order {
  _id: string;
  orderRef: string;
  user?: any;
  items: Array<{
    productId: any;
    title: string;
    color: string;
    size: string;
    quantity: number;
    priceAtTime: number;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    email: string;
    city: string;
    governorate?: string;
    region?: string;
    address: string;
    notes?: string;
  };
  paymentMethod: string;
  shippingFees?: number;
  estimatedDeliveryTime?: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
}

export interface GetOrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private apiUrl = `${API}/admin/orders`;

  constructor(private http: HttpClient) { }

  getAll(params: { page?: number; limit?: number; status?: string; search?: string }): Observable<GetOrdersResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<GetOrdersResponse>(this.apiUrl, { params: httpParams, withCredentials: true });
  }

  updateStatus(id: string, status: string): Observable<{ success: boolean; data: Order }> {
    return this.http.patch<{ success: boolean; data: Order }>(
      `${this.apiUrl}/${id}/status`,
      { status },
      { withCredentials: true }
    );
  }
}
