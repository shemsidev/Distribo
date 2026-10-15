import type {
  Address,
  AppNotification,
  AuthResponse,
  CartItemInput,
  CartPricing,
  Category,
  CategoryDetail,
  CreateOrderRequest,
  CreateOrderResponse,
  HomeData,
  Me,
  OrderDetail,
  OrderSummary,
  PagedResult,
  Product,
  ProductDetail,
  ProductQuery,
  RegisterRequest,
  RegisterResponse,
} from '@/types/api';

import { request } from './client';

export const authApi = {
  login: (identifier: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: { identifier, password }, auth: false }),
  register: (data: RegisterRequest) =>
    request<RegisterResponse>('/api/auth/register', { method: 'POST', body: data, auth: false }),
  logout: (refreshToken: string | null) =>
    request<void>('/api/auth/logout', { method: 'POST', body: { refreshToken } }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
};

export const meApi = {
  get: () => request<Me>('/api/me'),
  updatePreferences: (data: { orderUpdates?: boolean; offers?: boolean; language?: string }) =>
    request<Me>('/api/me/preferences', { method: 'PUT', body: data }),
  addresses: () => request<Address[]>('/api/addresses'),
  notifications: (page = 1) => request<PagedResult<AppNotification>>('/api/notifications', { query: { page } }),
  markNotificationsRead: () => request<void>('/api/notifications/read-all', { method: 'POST' }),
  registerPushToken: (token: string, platform: string) =>
    request<void>('/api/devices/push-token', { method: 'POST', body: { token, platform } }),
  unregisterPushToken: (token: string) =>
    request<void>('/api/devices/push-token/remove', { method: 'POST', body: { token } }),
};

export const catalogApi = {
  home: (signal?: AbortSignal) => request<HomeData>('/api/home', { signal }),
  categories: (parentId?: number) => request<Category[]>('/api/catalog/categories', { query: { parentId } }),
  category: (id: number) => request<CategoryDetail>(`/api/catalog/categories/${id}`),
  products: (q: ProductQuery, signal?: AbortSignal) =>
    request<PagedResult<Product>>('/api/catalog/products', { query: { ...q }, signal }),
  product: (id: number) => request<ProductDetail>(`/api/catalog/products/${id}`),
};

export const ordersApi = {
  pricing: (items: CartItemInput[], signal?: AbortSignal) =>
    request<CartPricing>('/api/cart/pricing', { method: 'POST', body: { items }, signal }),
  /** Pa riprovim automatik: dublikatat mbrohen me Idempotency-Key, që ruhet derisa porosia të konfirmohet. */
  create: (data: CreateOrderRequest, idempotencyKey: string) =>
    request<CreateOrderResponse>('/api/orders', {
      method: 'POST',
      body: data,
      headers: { 'Idempotency-Key': idempotencyKey },
      timeoutMs: 30_000,
    }),
  list: (page: number) => request<PagedResult<OrderSummary>>('/api/orders', { query: { page, pageSize: 20 } }),
  get: (id: string) => request<OrderDetail>(`/api/orders/${id}`),
  cancel: (id: string) => request<OrderDetail>(`/api/orders/${id}/cancel`, { method: 'POST' }),
};
