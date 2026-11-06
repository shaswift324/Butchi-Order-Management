import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getInitialState } from '../data/initialData.ts';
import {
  ActivityNotification,
  Order,
  OrderStatus,
  Product,
  Rider,
  StoreProfile,
  StoreState,
} from '../types/index.ts';

export type ActiveRole = 'owner' | 'rider';

interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark?: string;
  location: { lat: number; lng: number };
  items: Order['items'];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: Order['paymentMethod'];
  paymentStatus?: Order['paymentStatus'];
  status?: OrderStatus;
  assignedRiderId?: string;
  assignedRiderName?: string;
}

interface SaveProductInput {
  id?: string;
  name: string;
  category: Product['category'];
  description: string;
  price: number;
  unit: string;
  stockQuantity: number;
  imageUrl: string;
  isAvailable: boolean;
}

interface StoreContextValue {
  state: StoreState;
  loading: boolean;
  activeRole: ActiveRole;
  activeRiderId: string;
  currentRider?: Rider;
  setActiveRole: (role: ActiveRole) => void;
  setActiveRiderId: (id: string) => void;
  resetData: () => void;
  addRider: (payload: {
    name: string;
    phone?: string;
    vehicle?: string;
    plateNumber?: string;
    avatar?: string;
    status?: Rider['status'];
    currentLocation?: { lat: number; lng: number };
  }) => Promise<Rider>;
  createOrder: (payload: CreateOrderInput) => Promise<Order>;
  editOrder: (orderId: string, patch: Partial<Pick<Order, 'customerName' | 'customerPhone' | 'deliveryAddress' | 'landmark'>>) => Promise<Order>;
  apiConnected: boolean;
  saveProduct: (payload: SaveProductInput) => Promise<Product>;
  deleteProduct: (productId: string) => void;
  patchProduct: (productId: string, patch: Partial<Pick<Product, 'stockQuantity' | 'isAvailable'>>) => void;
  cancelOrder: (orderId: string) => void;
  updateStoreProfile: (payload: Partial<StoreProfile>) => Promise<StoreProfile>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<Order>;
  collectCodPayment: (orderId: string, amountCollected: number, notes?: string) => Promise<Order>;
  updateRiderLocation: (riderId: string, lat: number, lng: number, isLiveGps?: boolean) => Promise<Rider>;
  assignRiderToOrder: (orderId: string, riderId: string) => Promise<Order>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const STORAGE_KEY = 'butchi-state-v2';

interface Persisted { state: StoreState; activeRole: ActiveRole; activeRiderId: string }

/** Saved on the device so a refresh, dead zone or app switch never loses today's orders. */
function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed?.state?.orders || !parsed.state.products || !parsed.state.riders) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const saved = useMemo(loadPersisted, []);
  const [state, setState] = useState<StoreState>(() => saved?.state ?? getInitialState());
  const [loading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(saved?.activeRole ?? 'owner');
  const [activeRiderId, setActiveRiderIdState] = useState<string>(saved?.activeRiderId ?? 'rider-1');
  const skipNextPush = useRef(false);
  const lastServerVersion = useRef(0);
  const localWritePending = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, activeRole, activeRiderId }));
    } catch {
      /* storage full or blocked – the app still works for this session */
    }
  }, [state, activeRole, activeRiderId]);

  useEffect(() => {
    let alive = true;
    let pollTimer: number | undefined;

    const applyServerSnapshot = (payload: { state?: StoreState; updatedAt?: number }) => {
      if (!payload.state || !payload.updatedAt || payload.updatedAt <= lastServerVersion.current) return;
      lastServerVersion.current = payload.updatedAt;
      if (!localWritePending.current) {
        skipNextPush.current = true;
        setState(payload.state);
      }
    };

    const connect = async () => {
      try {
        const response = await fetch('/api/state');
        if (!response.ok) throw new Error('API unavailable');
        const payload = await response.json();
        if (!alive) return;
        setApiConnected(true);
        if (payload.state) applyServerSnapshot(payload);
        else {
          localWritePending.current = true;
          const savedResponse = await fetch('/api/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state }),
          });
          if (!savedResponse.ok) throw new Error('Could not initialize shared data');
          const savedPayload = await savedResponse.json();
          lastServerVersion.current = savedPayload.updatedAt || Date.now();
          localWritePending.current = false;
        }
      } catch {
        if (alive) setApiConnected(false);
        localWritePending.current = false;
      }
    };

    void connect();
    pollTimer = window.setInterval(async () => {
      try {
        const response = await fetch('/api/state');
        if (!response.ok) throw new Error('API unavailable');
        const payload = await response.json();
        if (!alive) return;
        setApiConnected(true);
        applyServerSnapshot(payload);
      } catch {
        if (alive) setApiConnected(false);
      }
    }, 2000);

    return () => {
      alive = false;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, []);

  useEffect(() => {
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (!apiConnected) return;
    localWritePending.current = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state }),
        });
        if (!response.ok) throw new Error('Sync failed');
        const payload = await response.json();
        lastServerVersion.current = payload.updatedAt || Date.now();
      } catch {
        setApiConnected(false);
      } finally {
        localWritePending.current = false;
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state, apiConnected]);

  const currentRider = useMemo(
    () => state.riders.find((rider) => rider.id === activeRiderId),
    [state.riders, activeRiderId]
  );

  const setActiveRole = (role: ActiveRole) => setActiveRoleState(role);
  const setActiveRiderId = (id: string) => setActiveRiderIdState(id);

  const resetData = () => {
    const fresh = getInitialState();
    setState(fresh);
    setActiveRiderIdState(fresh.riders[0]?.id || 'rider-1');
  };

  const createOrder = async (payload: CreateOrderInput): Promise<Order> => {
    if (activeRole !== 'owner') throw new Error('Only the owner can create orders.');
    const nextOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `BTC-2026-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      deliveryAddress: payload.deliveryAddress,
      landmark: payload.landmark || '',
      location: payload.location,
      items: payload.items,
      subtotal: payload.subtotal,
      deliveryFee: payload.deliveryFee,
      totalAmount: payload.totalAmount,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentStatus || 'unpaid',
      status: payload.status || 'pending',
      assignedRiderId: payload.assignedRiderId,
      assignedRiderName: payload.assignedRiderName,
      deliveryNotes: '',
    };

    setState((prev) => ({
      ...prev,
      orders: [nextOrder, ...prev.orders],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'new_order' as const,
          title: 'New Order Created',
          message: `Order #${nextOrder.orderNumber} for ${nextOrder.customerName}.`,
          orderNumber: nextOrder.orderNumber,
          orderId: nextOrder.id,
          isRead: false,
        },
        ...prev.notifications,
      ].slice(0, 50),
    }));

    return nextOrder;
  };

  const editOrder = async (
    orderId: string,
    patch: Partial<Pick<Order, 'customerName' | 'customerPhone' | 'deliveryAddress' | 'landmark'>>
  ): Promise<Order> => {
    if (activeRole !== 'owner') throw new Error('Only the owner can edit orders.');
    const existing = state.orders.find((order) => order.id === orderId);
    if (!existing) throw new Error('Order not found');
    if (existing.status === 'delivered' || existing.status === 'cancelled') throw new Error('This order can no longer be edited.');
    const updated = { ...existing, ...patch };
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((order) => order.id === orderId ? updated : order),
    }));
    return updated;
  };

  const saveProduct = async (payload: SaveProductInput): Promise<Product> => {
    const productId = payload.id || `prod-${Date.now()}`;
    const newProduct: Product = {
      id: productId,
      name: payload.name,
      category: payload.category,
      description: payload.description,
      price: payload.price,
      imageUrl: payload.imageUrl,
      stockQuantity: payload.stockQuantity,
      isAvailable: payload.isAvailable,
      unit: payload.unit,
      soldCount: state.products.find((p) => p.id === productId)?.soldCount ?? 0,
    };

    setState((prev) => {
      const exists = prev.products.some((product) => product.id === productId);
      return {
        ...prev,
        products: exists
          ? prev.products.map((product) => (product.id === productId ? { ...product, ...newProduct } : product))
          : [newProduct, ...prev.products],
      };
    });

    return newProduct;
  };

  const updateStoreProfile = async (payload: Partial<StoreProfile>): Promise<StoreProfile> => {
    setState((prev) => ({
      ...prev,
      storeProfile: {
        ...prev.storeProfile,
        ...payload,
      },
    }));

    return { ...state.storeProfile, ...payload };
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order> => {
    const existing = state.orders.find((o) => o.id === orderId);
    if (!existing) throw new Error('Order not found');
    if (existing.status === 'delivered' || existing.status === 'cancelled') throw new Error('This order can no longer be updated.');
    if (activeRole === 'owner' && status === 'delivered') throw new Error('Only the assigned rider can mark an order as delivered.');
    if (activeRole === 'rider' && status !== 'delivered') throw new Error('Riders can only mark assigned deliveries as delivered.');
    if (activeRole === 'rider' && existing.assignedRiderId !== activeRiderId) throw new Error('This delivery is not assigned to the selected rider.');
    if (status === 'preparing' && !['pending', 'confirmed'].includes(existing.status)) throw new Error('This order cannot move to Preparing from its current status.');
    if (status === 'out_for_delivery' && !['preparing', 'ready_for_delivery'].includes(existing.status)) throw new Error('Prepare the order before dispatching it.');
    if (status === 'out_for_delivery' && !existing.assignedRiderId) throw new Error('Assign a rider before sending this order out.');
    if (status === 'delivered' && existing.status !== 'out_for_delivery') throw new Error('Only orders that are out for delivery can be marked delivered.');
    const now = new Date().toISOString();
    const updated: Order = {
      ...existing,
      status,
      ...(status === 'out_for_delivery' ? { outForDeliveryAt: now } : {}),
      ...(status === 'delivered' ? { deliveredAt: now } : {}),
    };
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? updated : o)),
      riders:
        status === 'delivered' && existing.status !== 'delivered' && existing.assignedRiderId
          ? prev.riders.map((r) =>
              r.id === existing.assignedRiderId
                ? { ...r, completedDeliveriesToday: r.completedDeliveriesToday + 1 }
                : r
            )
          : prev.riders,
      notifications:
        status === 'delivered'
          ? [
              {
                id: `notif-${Date.now()}`,
                timestamp: now,
                type: 'delivered' as const,
                title: 'Order delivered',
                message: `${existing.customerName} · #${existing.orderNumber}`,
                orderId,
                orderNumber: existing.orderNumber,
                isRead: false,
              },
              ...prev.notifications,
            ].slice(0, 50)
          : prev.notifications,
    }));
    return updated;
  };

  const cancelOrder = (orderId: string) => {
    if (activeRole !== 'owner') throw new Error('Only the owner can cancel orders.');
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' as const } : o)),
    }));
  };

  const deleteProduct = (productId: string) => {
    setState((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== productId) }));
  };

  const patchProduct = (
    productId: string,
    patch: Partial<Pick<Product, 'stockQuantity' | 'isAvailable'>>
  ) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === productId ? { ...p, ...patch } : p)),
    }));
  };

  const collectCodPayment = async (
    orderId: string,
    amountCollected: number,
    notes?: string
  ): Promise<Order> => {
    if (activeRole !== 'rider') throw new Error('Only the assigned rider can collect COD payment.');
    const existing = state.orders.find((o) => o.id === orderId);
    if (!existing) throw new Error('Order not found');
    if (existing.assignedRiderId !== activeRiderId || !['out_for_delivery', 'delivered'].includes(existing.status)) {
      throw new Error('This payment is not assigned to the selected rider.');
    }
    const updated: Order = {
      ...existing,
      paymentStatus: 'collected_on_delivery',
      amountCollected,
      proofNote: notes || existing.proofNote,
    };
    // Count what the order is worth, not the big bill handed over (change goes back to the customer)
    const kept = Math.min(amountCollected, existing.totalAmount);
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? {
        ...o,
        paymentStatus: 'collected_on_delivery',
        amountCollected,
        proofNote: notes || o.proofNote,
      } : o)),
      riders: prev.riders.map((r) =>
        r.id === existing.assignedRiderId
          ? { ...r, totalCodCollectedToday: r.totalCodCollectedToday + kept }
          : r
      ),
    }));
    return updated;
  };

  const updateRiderLocation = async (
    riderId: string,
    lat: number,
    lng: number,
    isLiveGps = true
  ): Promise<Rider> => {
    let updated: Rider | undefined;
    setState((prev) => ({
      ...prev,
      riders: prev.riders.map((rider) => {
        if (rider.id !== riderId) return rider;
        updated = {
          ...rider,
          currentLocation: {
            lat,
            lng,
            lastUpdated: new Date().toISOString(),
            isLiveGps,
          },
        };
        return updated;
      }),
    }));

    if (!updated) {
      throw new Error('Rider not found');
    }

    return updated;
  };

  const addRider = async (payload: {
    name: string;
    phone?: string;
    vehicle?: string;
    plateNumber?: string;
    avatar?: string;
    status?: Rider['status'];
    currentLocation?: { lat: number; lng: number };
  }): Promise<Rider> => {
    const riderId = `rider-${Date.now()}`;
    const newRider: Rider = {
      id: riderId,
      name: payload.name,
      phone: payload.phone || '',
      vehicle: payload.vehicle || 'Motorcycle',
      plateNumber: payload.plateNumber || '',
      status: payload.status || 'available',
      currentLocation: {
        lat: payload.currentLocation?.lat || 14.8528,
        lng: payload.currentLocation?.lng || 120.816,
        lastUpdated: new Date().toISOString(),
        isLiveGps: false,
      },
      avatar: payload.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      completedDeliveriesToday: 0,
      totalCodCollectedToday: 0,
    };

    setState((prev) => ({
      ...prev,
      riders: [...prev.riders, newRider],
    }));

    return newRider;
  };

  const assignRiderToOrder = async (orderId: string, riderId: string): Promise<Order> => {
    if (activeRole !== 'owner') throw new Error('Only the owner can assign riders.');
    if (!state.riders.some((rider) => rider.id === riderId)) throw new Error('Rider not found');
    let updated: Order | undefined;
    setState((prev) => {
      const rider = prev.riders.find((item) => item.id === riderId);
      return {
        ...prev,
        orders: prev.orders.map((order) => {
          if (order.id !== orderId) return order;
          if (order.status === 'out_for_delivery' || order.status === 'delivered' || order.status === 'cancelled') {
            updated = order;
            return order;
          }
          updated = {
            ...order,
            assignedRiderId: riderId,
            assignedRiderName: rider?.name || order.assignedRiderName,
            assignedAt: new Date().toISOString(),
          };
          return updated;
        }),
      };
    });

    if (!updated) throw new Error('Order not found');
    return updated;
  };

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      loading,
      activeRole,
      activeRiderId,
      currentRider,
      setActiveRole,
      setActiveRiderId,
      resetData,
      addRider,
      createOrder,
      editOrder,
      apiConnected,
      saveProduct,
      deleteProduct,
      patchProduct,
      cancelOrder,
      updateStoreProfile,
      updateOrderStatus,
      assignRiderToOrder,
      collectCodPayment,
      updateRiderLocation,
    }),
    [state, loading, activeRole, activeRiderId, currentRider, apiConnected]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreContextValue => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
