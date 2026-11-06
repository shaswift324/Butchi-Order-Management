import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { useToast } from '../../ui/Toast.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { Confirm } from '../../ui/Confirm.tsx';
import { Product, ProductCategory } from '../../types/index.ts';
import { Trash2 } from 'lucide-react';

const CATEGORIES: ProductCategory[] = ['Butchi', 'Kakanin', 'Snacks', 'Desserts'];

const PHOTOS = [
  { name: 'Ube Butchi', url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80' },
  { name: 'Red Bean', url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80' },
  { name: 'Cheese', url: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=600&q=80' },
  { name: 'Bibingka', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80' },
  { name: 'Puto Bumbong', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80' },
  { name: 'Kutsinta', url: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=600&q=80' },
  { name: 'Cassava Cake', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80' },
  { name: 'Sapin-Sapin', url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80' },
  { name: 'Turon', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
];

/** Rendered only while open (with `key`), so editing one item never shows another item's values. */
export const ProductModal: React.FC<{ product: Product | null; onClose: () => void }> = ({ product, onClose }) => {
  const { saveProduct, deleteProduct } = useStore();
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? 'Butchi');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState<string>(String(product?.price ?? 180));
  const [unit, setUnit] = useState(product?.unit ?? 'Box of 12');
  const [stock, setStock] = useState<string>(String(product?.stockQuantity ?? 30));
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? PHOTOS[0].url);
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!name.trim()) return setError('Give the item a name.');
    if (!(Number(price) > 0)) return setError('Price must be more than ₱0.');
    await saveProduct({
      id: product?.id, name: name.trim(), category, description: description.trim(),
      price: Number(price), unit: unit.trim() || 'Piece', stockQuantity: Math.max(0, Number(stock) || 0), imageUrl, isAvailable,
    });
    toast(product ? 'Item updated' : 'Added to menu');
    onClose();
  };

  return (
    <Sheet
      title={product ? 'Edit item' : 'Add menu item'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          {product && (
            <button className="btn-danger btn-big !px-4" aria-label="Delete item" onClick={() => setConfirmDelete(true)}><Trash2 className="h-6 w-6" /></button>
          )}
          <button className="btn-primary btn-big flex-1" onClick={save}>{product ? 'Save changes' : 'Add to menu'}</button>
        </div>
      }
    >
      <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        {error && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">⚠️ {error}</p>}

        <div>
          <label className="label" htmlFor="pm-name">Name</label>
          <input id="pm-name" className="field" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Choco-Lava Butchi (Box of 12)" />
        </div>

        <div>
          <span className="label">Category</span>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
            {CATEGORIES.map((c) => <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-on' : ''}`}>{c}</button>)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="pm-price">Price (₱)</label>
            <input id="pm-price" className="field" type="number" inputMode="numeric" min={1} value={price} onChange={(e) => { setPrice(e.target.value); setError(''); }} />
          </div>
          <div>
            <label className="label" htmlFor="pm-stock">In stock</label>
            <input id="pm-stock" className="field" type="number" inputMode="numeric" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pm-unit">Sold as</label>
          <input id="pm-unit" className="field" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Box of 12" />
        </div>

        <div>
          <label className="label" htmlFor="pm-desc">Description <span className="font-medium text-stone-400">(optional)</span></label>
          <textarea id="pm-desc" rows={2} className="field py-3" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <span className="label">Photo</span>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 no-scrollbar">
            {PHOTOS.map((p) => (
              <button key={p.url} type="button" aria-pressed={imageUrl === p.url} aria-label={p.name} onClick={() => setImageUrl(p.url)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-4 ${imageUrl === p.url ? 'border-amber-600' : 'border-transparent'}`}>
                <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
          <input className="field" type="url" inputMode="url" aria-label="Photo link" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…or paste a photo link" />
        </div>

        <button type="button" role="switch" aria-checked={isAvailable} onClick={() => setIsAvailable(!isAvailable)}
          className={`flex min-h-14 w-full items-center justify-between rounded-2xl px-4 text-left font-extrabold ${isAvailable ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-600'}`}>
          <span>{isAvailable ? 'Available for orders' : 'Marked sold out'}</span>
          <span className={`relative h-7 w-12 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-stone-400'}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${isAvailable ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </form>

      {confirmDelete && product && (
        <Confirm
          title="Delete this item?"
          message={`“${product.name}” will be removed from your menu. Past orders are not affected.`}
          confirmLabel="Delete item"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { deleteProduct(product.id); toast('Item deleted', 'warn'); onClose(); }}
        />
      )}
    </Sheet>
  );
};
