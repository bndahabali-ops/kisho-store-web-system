// ============================================================
// Agent 3 — Auth Interfaces
// ============================================================

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Admin {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoginResponse {
  status: string;
  token: string;       // ← token is at the ROOT level (not inside data)
  data: {
    admin: Admin;      // ← admin is inside data
  };
}

export interface ApiError {
  status: string;
  message: string;
  errors?: string[];
}
