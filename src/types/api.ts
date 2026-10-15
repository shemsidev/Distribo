/** Tipet e kontratave të Distribo API (pasqyrë e server/Distribo.Api/Contracts). */

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

// ---------- Auth ----------

export interface NotificationPreferences {
  orderUpdates: boolean;
  offers: boolean;
}

export type CustomerStatus = 'PendingApproval' | 'Active' | 'Blocked';

export interface Customer {
  id: number;
  businessName: string;
  taxNumber: string | null;
  externalCode: string | null;
  status: CustomerStatus;
}

export interface Me {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  language: string;
  notificationPreferences: NotificationPreferences;
  customer: Customer;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  /** Bosh në web: refresh token-i mbahet në cookie HttpOnly. */
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: Me;
}

export interface RegisterRequest {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  password: string;
  taxNumber?: string;
  city?: string;
  street?: string;
}

export interface RegisterResponse {
  requiresApproval: boolean;
  session: AuthResponse | null;
  message: string;
}

export interface Address {
  id: number;
  name: string;
  street: string;
  city: string;
  contactName: string | null;
  contactPhone: string | null;
  isDefault: boolean;
}

// ---------- Katalogu ----------

export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  icon: string | null;
  imageUrl: string | null;
  productCount: number;
  subcategoryCount: number;
}

export interface CategoryDetail {
  category: Category;
  parent: Category | null;
  children: Category[];
}

export interface Stock {
  visible: boolean;
  quantity: number | null;
  inStock: boolean;
}

export interface Product {
  id: number;
  code: string;
  barcode: string | null;
  name: string;
  categoryId: number;
  categoryName: string;
  imageUrl: string | null;
  unit: string;
  packagingInfo: string | null;
  packSize: number;
  minOrderQuantity: number;
  price: number;
  promoPrice: number | null;
  promoTitle: string | null;
  stock: Stock;
}

export interface ProductDetail extends Product {
  description: string | null;
  promoEndsAt: string | null;
}

export type ProductSort = 'name' | 'name_desc' | 'price_asc' | 'price_desc';

export interface ProductQuery {
  search?: string;
  categoryId?: number;
  sort?: ProductSort;
  promoOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface HomeData {
  /** null për vizitorët pa llogari. */
  greeting: string | null;
  notice: string | null;
  ticker: string | null;
  categories: Category[];
  offers: Product[];
  frequentlyBought: Product[];
  recentOrders: OrderSummary[];
}

// ---------- Shporta dhe porositë ----------

export interface CartItemInput {
  productId: number;
  quantity: number;
}

export interface CartLineIssue {
  code:
    | 'unavailable'
    | 'invalid_quantity'
    | 'below_minimum'
    | 'not_pack_multiple'
    | 'out_of_stock'
    | 'insufficient_stock'
    | (string & {});
  message: string;
}

export interface CartLine {
  productId: number;
  code: string;
  name: string;
  imageUrl: string | null;
  unit: string;
  quantity: number;
  packSize: number;
  minOrderQuantity: number;
  listPrice: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  issues: CartLineIssue[];
}

export interface CartPricing {
  lines: CartLine[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  total: number;
  isValid: boolean;
  currency: string;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Preparing' | 'InTransit' | 'Delivered' | 'Cancelled';

export interface OrderSummary {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
}

export interface OrderLine {
  productId: number;
  productCode: string;
  productName: string;
  imageUrl: string | null;
  unit: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
}

export interface OrderDetail {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  canCancel: boolean;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  notes: string | null;
  requestedDeliveryDate: string | null;
  deliveryAddress: {
    addressId: number;
    name: string;
    street: string;
    city: string;
    contactName: string | null;
    contactPhone: string | null;
  };
  lines: OrderLine[];
  statusHistory: { status: OrderStatus; changedAt: string; note: string | null }[];
}

export interface CreateOrderRequest {
  addressId: number;
  items: CartItemInput[];
  notes?: string;
  requestedDeliveryDate?: string;
  expectedTotal?: number;
}

export interface CreateOrderResponse {
  order: OrderDetail;
  replayed: boolean;
}

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  orderId: string | null;
  createdAt: string;
  isRead: boolean;
}
