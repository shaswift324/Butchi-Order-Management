import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Order, Rider, StoreProfile } from '../../types/index.ts';
import { getGoogleMapsNavigationUrl, formatDistance } from '../../utils/geo.ts';
import { Navigation, Phone, X, Crosshair, MapPin } from 'lucide-react';

interface DeliveryMapProps {
  orders: Order[];
  rider?: Rider;
  storeProfile: StoreProfile;
  recommendedOrder?: Order | null;
  onSelectOrder?: (order: Order) => void;
  selectedOrderId?: string;
  heightClass?: string;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  orders,
  rider,
  storeProfile,
  recommendedOrder,
  onSelectOrder,
  selectedOrderId,
  heightClass = 'h-[340px] sm:h-[480px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);

  // Active tapped order for mobile slide-up card
  const [tappedOrder, setTappedOrder] = useState<Order | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = rider?.currentLocation?.lat || storeProfile.location.lat;
      const initialLng = rider?.currentLocation?.lng || storeProfile.location.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        tapTolerance: 20, // Better mobile touch responsiveness
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      polylineLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, [rider?.currentLocation?.lat, rider?.currentLocation?.lng, storeProfile.location.lat, storeProfile.location.lng]);

  // Tear the map down when leaving the tab so it doesn't leak between tab switches
  useEffect(() => {
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      polylineLayerRef.current = null;
    };
  }, []);

  // Only auto-fit when the set of stops changes – never while the rider is panning or GPS ticks
  const lastFitKey = useRef('');

  // Recenter map helper
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const target = recommendedOrder?.location || rider?.currentLocation || storeProfile.location;
    mapInstanceRef.current.setView([target.lat, target.lng], 14, { animate: true });
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const allPoints: [number, number][] = [
      [storeProfile.location.lat, storeProfile.location.lng],
      ...(rider ? [[rider.currentLocation.lat, rider.currentLocation.lng] as [number, number]] : []),
      ...orders.map((o) => [o.location.lat, o.location.lng] as [number, number]),
    ];
    if (allPoints.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
    }
  };

  // Update Markers & Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !polylineLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    polylineLayerRef.current.clearLayers();

    const boundsLatLngs: [number, number][] = [];

    // 1. Store Hub
    const storeIcon = L.divIcon({
      className: 'store-hub-icon',
      html: `
        <div class="relative flex items-center justify-center p-1 cursor-pointer">
          <div class="w-10 h-10 rounded-2xl bg-amber-800 border-2 border-white shadow-lg flex items-center justify-center text-white text-base">
            🏪
          </div>
          <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-900 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow">
            Kitchen Hub
          </span>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const storeMarker = L.marker([storeProfile.location.lat, storeProfile.location.lng], {
      icon: storeIcon,
    }).bindPopup(`
      <div class="p-2 text-stone-800 text-xs">
        <strong class="text-amber-900">${storeProfile.name}</strong>
        <p class="text-stone-600 text-xs">${storeProfile.address}</p>
      </div>
    `);
    markersLayerRef.current.addLayer(storeMarker);
    boundsLatLngs.push([storeProfile.location.lat, storeProfile.location.lng]);

    // 2. Rider Marker
    let currentRiderCoord: [number, number] | null = null;
    if (rider && rider.currentLocation) {
      currentRiderCoord = [rider.currentLocation.lat, rider.currentLocation.lng];
      const isLive = rider.currentLocation.isLiveGps;

      const riderIcon = L.divIcon({
        className: 'rider-marker-icon',
        html: `
          <div class="relative flex items-center justify-center p-1 cursor-pointer">
            ${
              isLive
                ? '<div class="absolute -inset-2 rounded-full bg-orange-500 animate-ping opacity-60"></div>'
                : ''
            }
            <div class="relative w-11 h-11 rounded-2xl bg-orange-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xl">
              🛵
            </div>
            <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-orange-950 text-white text-xs font-bold px-1.5 py-0.2 rounded-full shadow">
              ${rider.name.split(' ')[0]}
            </span>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const riderMarker = L.marker(currentRiderCoord, { icon: riderIcon });
      markersLayerRef.current.addLayer(riderMarker);
      boundsLatLngs.push(currentRiderCoord);
    }

    // 3. Customer Delivery Markers
    orders.forEach((order) => {
      const isRecommended = recommendedOrder?.id === order.id;
      const isDelivered = order.status === 'delivered';
      const isSelected = selectedOrderId === order.id || tappedOrder?.id === order.id;

      let markerColor = isDelivered ? 'bg-emerald-600' : isRecommended ? 'bg-rose-600' : 'bg-amber-700';
      let borderStyle = isRecommended ? 'border-yellow-300 ring-4 ring-rose-300/50' : 'border-white';
      let iconSymbol = isDelivered ? '✓' : isRecommended ? '★' : '📦';

      const orderIcon = L.divIcon({
        className: 'custom-order-icon',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer p-1">
            ${
              isRecommended
                ? '<div class="absolute -inset-1.5 rounded-full bg-rose-500 animate-pulse opacity-75"></div>'
                : ''
            }
            <div class="w-10 h-10 rounded-2xl ${markerColor} ${borderStyle} border-2 shadow-lg flex items-center justify-center text-white font-black text-sm transition-transform active:scale-90">
              ${iconSymbol}
            </div>
            <span class="mt-0.5 whitespace-nowrap px-1.5 py-0.2 rounded text-xs font-bold shadow ${
              isRecommended ? 'bg-rose-950 text-yellow-300' : 'bg-stone-900 text-stone-100'
            }">
              ${order.customerName.split(' ')[0]}
            </span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([order.location.lat, order.location.lng], { icon: orderIcon });

      marker.on('click', () => {
        setTappedOrder(order);
        if (onSelectOrder) onSelectOrder(order);
      });

      markersLayerRef.current?.addLayer(marker);
      boundsLatLngs.push([order.location.lat, order.location.lng]);
    });

    // 4. Route Polyline to Recommended Order
    if (recommendedOrder) {
      const startPoint: [number, number] = currentRiderCoord || [
        storeProfile.location.lat,
        storeProfile.location.lng,
      ];
      const endPoint: [number, number] = [
        recommendedOrder.location.lat,
        recommendedOrder.location.lng,
      ];

      const polyline = L.polyline([startPoint, endPoint], {
        color: '#e11d48',
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.9,
      });
      polylineLayerRef.current.addLayer(polyline);
    }

    // Auto-fit on initial load or count change
    const fitKey = orders.map((o) => `${o.id}:${o.status}`).join('|') + (recommendedOrder?.id ?? '');
    if (boundsLatLngs.length > 0 && fitKey !== lastFitKey.current) {
      lastFitKey.current = fitKey;
      map.fitBounds(L.latLngBounds(boundsLatLngs), { padding: [35, 35], maxZoom: 14 });
    }
  }, [orders, rider, storeProfile, recommendedOrder, selectedOrderId, tappedOrder, onSelectOrder]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-stone-200 shadow-xs bg-stone-100">
      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-0 touch-pan-x touch-pan-y`} />

      {/* Floating Map Controls on Mobile */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5">
        <button
          onClick={handleRecenter}
          className="flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-800 shadow-md active:scale-95 transition-transform"
          title="Recenter on next stop"
        >
          <Crosshair className="h-5 w-5 text-orange-600" />
          <span>Next stop</span>
        </button>

        <button
          onClick={handleFitAll}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-800 shadow-md active:scale-95 transition-transform"
          title="Fit all stops"
        >
          <span>See all</span>
        </button>
      </div>

      {/* Mobile Slide-Up Order Card when marker is tapped */}
      {tappedOrder && (
        <div className="absolute bottom-2 left-2 right-2 z-[400] bg-white rounded-2xl p-4 shadow-xl border border-stone-200 animate-in slide-in-from-bottom-4 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-950">
                  {tappedOrder.orderNumber}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase bg-stone-100 text-stone-700">
                  {tappedOrder.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h4 className="mt-0.5 text-base font-extrabold text-stone-900">
                {tappedOrder.customerName}
              </h4>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-600">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">{tappedOrder.deliveryAddress}</span>
              </p>
            </div>

            <button
              onClick={() => setTappedOrder(null)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600" aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs text-stone-500">Total: </span>
              <strong className="text-sm font-black text-stone-900">
                ₱{tappedOrder.totalAmount.toLocaleString()}
              </strong>
              <span className="text-xs text-stone-500 ml-1.5">
                ({tappedOrder.paymentMethod})
              </span>
            </div>

            <div className="flex gap-1.5">
              <a
                href={getGoogleMapsNavigationUrl(tappedOrder.location, rider?.currentLocation)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center gap-1.5 rounded-2xl bg-amber-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-amber-700"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Navigate</span>
              </a>
              <a
                href={`tel:${tappedOrder.customerPhone}`}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-900 hover:bg-stone-200" aria-label="Call customer"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
