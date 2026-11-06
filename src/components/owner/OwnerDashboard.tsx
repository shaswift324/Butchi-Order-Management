import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { Product } from '../../types/index.ts';
import { TabBar } from '../../ui/TabBar.tsx';
import { OrdersTab, OrderFilter } from './OrdersTab.tsx';
import { TodayTab } from './TodayTab.tsx';
import { MenuTab } from './MenuTab.tsx';
import { MoreTab } from './MoreTab.tsx';
import { OrderFormModal } from './OrderFormModal.tsx';
import { ProductModal } from './ProductModal.tsx';
import { DeliveryFeeModal } from './DeliveryFeeModal.tsx';
import { RiderFormModal } from './RiderFormModal.tsx';
import { ClipboardList, LayoutDashboard, UtensilsCrossed, Menu, Plus } from 'lucide-react';

type Tab = 'orders' | 'today' | 'menu' | 'more';
type Sheet = null | 'order' | 'fees' | 'rider' | { product: Product | null };

const TITLES: Record<Tab, string> = { orders: 'Orders', today: 'Today at a glance', menu: 'Menu & stock', more: 'Settings' };

export const OwnerDashboard: React.FC = () => {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>('orders');
  const [filter, setFilter] = useState<OrderFilter>('active');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);

  const newCount = state.orders.filter((o) => o.status === 'pending').length;
  const close = () => setSheet(null);

  const openOrders = (f: OrderFilter, s = '') => { setFilter(f); setSearch(s); setTab('orders'); window.scrollTo({ top: 0 }); };

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">{TITLES[tab]}</h1>
          {tab === 'orders' && <p className="mt-0.5 text-sm text-stone-500">Manage customer orders and deliveries</p>}
        </div>
        {tab === 'orders' && (
          <button
            type="button"
            onClick={() => setSheet('order')}
            className="btn-primary min-h-11 w-full justify-center px-5 sm:w-auto"
          >
            <Plus className="h-5 w-5" /> New Order
          </button>
        )}
      </div>

      {tab === 'orders' && <OrdersTab filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onNewOrder={() => setSheet('order')} />}
      {tab === 'today' && <TodayTab openOrders={openOrders} openMenu={() => setTab('menu')} />}
      {tab === 'menu' && <MenuTab onAdd={() => setSheet({ product: null })} onEdit={(product) => setSheet({ product })} />}
      {tab === 'more' && <MoreTab onFees={() => setSheet('fees')} onAddRider={() => setSheet('rider')} />}

      <TabBar<Tab>
        active={tab}
        onChange={(t) => { setTab(t); window.scrollTo({ top: 0 }); }}
        tabs={[
          { id: 'orders', label: 'Orders', icon: <ClipboardList />, badge: newCount },
          { id: 'today', label: 'Today', icon: <LayoutDashboard /> },
          { id: 'menu', label: 'Menu', icon: <UtensilsCrossed /> },
          { id: 'more', label: 'More', icon: <Menu /> },
        ]}
      />

      {sheet === 'order' && <OrderFormModal onClose={close} />}
      {sheet === 'fees' && <DeliveryFeeModal onClose={close} />}
      {sheet === 'rider' && <RiderFormModal onClose={close} />}
      {sheet && typeof sheet === 'object' && <ProductModal key={sheet.product?.id ?? 'new'} product={sheet.product} onClose={close} />}
    </>
  );
};
