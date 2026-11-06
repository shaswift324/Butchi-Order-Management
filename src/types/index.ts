export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'Cash on Delivery' | 'GCash' | 'Maya';

export type PaymentStatus = 'unpaid' | 'paid' | 'collected_on_delivery';

export type ProductCategory = 'Butchi' | 'Kakanin' | 'Snacks' | 'Desserts';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number; // in PHP ₱
  imageUrl: string;
  stockQuantity: number;
  isAvailable: boolean;
  unit: string; // e.g. "Box of 12", "Tub", "Platter", "Pack"
  soldCount: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  unit: string;
}

export interface CustomerLocation {
  lat: number;
  lng: number;
  address: string;
  barangay?: string;
  city?: string;
  landmark?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. BTC-2026-1041
  createdAt: string; // ISO
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark?: string;
  location: {
    lat: number;
    lng: number;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashAmountExpected?: number; // e.g., customer paying with 1000 bill
  amountCollected?: number;
  status: OrderStatus;
  assignedRiderId?: string;
  assignedRiderName?: string;
  assignedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
  proofNote?: string;
  routeOrderIndex?: number;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plateNumber: string;
  status: 'available' | 'on_delivery' | 'offline';
  currentLocation: {
    lat: number;
    lng: number;
    lastUpdated: string;
    isLiveGps: boolean;
  };
  avatar: string;
  completedDeliveriesToday: number;
  totalCodCollectedToday: number;
}

export interface StoreProfile {
  name: string;
  tagline: string;
  phone: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  operatingHours: string;
  gcashNumber: string;
  gcashName: string;
  defaultDeliveryFee: number;
  townDeliveryFees?: Record<string, number>;
}

export interface ActivityNotification {
  id: string;
  timestamp: string;
  type: 'new_order' | 'assigned' | 'status_change' | 'delivered' | 'payment_collected';
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  isRead?: boolean;
}

export interface StoreState {
  products: Product[];
  orders: Order[];
  riders: Rider[];
  storeProfile: StoreProfile;
  notifications: ActivityNotification[];
}
