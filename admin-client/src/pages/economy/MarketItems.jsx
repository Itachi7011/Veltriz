import React, { useEffect, useState } from 'react';
import { Store, Plus, Save, Zap } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };

const emptyItem = {
  key: '',
  name: '',
  category: 'commodity',
  basePrice: 100,
  volatilityPercent: 2,
  sellRateMultiplier: 0.85,
  icon: 'package',
  isActive: true,
};

const MarketItems = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    http.get('/api/economy/market-items').then(({ data: res }) => setItems(res.items)).finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    try {
      await http.post('/api/economy/market-items', editing);
      setEditing(null);
      load();
      Swal.fire({ icon: 'success', title: 'Item saved', timer: 1400, showConfirmButton: false, ...swalTheme });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message, ...swalTheme });
    } finally {
      setSaving(false);
    }
  };

  const overridePrice = async (item) => {
    const { value: form } = await Swal.fire({
      title: `Override price — ${item.name}`,
      html:
        `<p style="font-size:0.85rem;color:#94a3b8;margin-bottom:10px;text-align:left;">Current live price: <strong>${item.currentPrice}</strong> VC</p>` +
        '<input id="swal-newprice" class="swal2-input" type="number" placeholder="New live price (instant, broadcast to all players)">' +
        '<input id="swal-newbase" class="swal2-input" type="number" placeholder="OR new base price (gradual drift anchor)">',
      focusConfirm: false,
      showCancelButton: true,
      ...swalTheme,
      preConfirm: () => {
        const newPrice = document.getElementById('swal-newprice').value;
        const newBasePrice = document.getElementById('swal-newbase').value;
        if (!newPrice && !newBasePrice) {
          Swal.showValidationMessage('Enter at least one value');
          return false;
        }
        return {
          itemKey: item.key,
          ...(newPrice ? { newPrice: Number(newPrice) } : {}),
          ...(newBasePrice ? { newBasePrice: Number(newBasePrice) } : {}),
        };
      },
    });

    if (!form) return;
    try {
      await http.post('/api/economy/market-items/adjust-price', form);
      load();
      Swal.fire({
        icon: 'success',
        title: 'Price updated',
        text: form.newPrice ? 'Broadcast instantly to every connected player.' : 'New anchor set — price will drift toward it.',
        timer: 2000,
        showConfirmButton: false,
        ...swalTheme,
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message, ...swalTheme });
    }
  };

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Store size={22} /> Market Items
          </h1>
          <p className="veltriz-adminpage-subtitle">
            Set base prices/volatility, or use <strong>Override price</strong> for instant, real-time control.
          </p>
        </div>
        <button className="veltriz-adminpage-btn primary" onClick={() => setEditing({ ...emptyItem })}>
          <Plus size={15} /> New item
        </button>
      </div>

      {editing && (
        <div className="veltriz-adminpage-card">
          <h3 style={{ marginTop: 0 }}>{items.find((i) => i.key === editing.key) ? 'Edit item' : 'New item'}</h3>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              placeholder="key (unique, e.g. 'silver')"
              value={editing.key}
              onChange={(e) => setEditing((i) => ({ ...i, key: e.target.value }))}
            />
            <input
              className="veltriz-adminpage-input"
              placeholder="Name"
              value={editing.name}
              onChange={(e) => setEditing((i) => ({ ...i, name: e.target.value }))}
            />
            <select
              className="veltriz-adminpage-select"
              value={editing.category}
              onChange={(e) => setEditing((i) => ({ ...i, category: e.target.value }))}
            >
              <option value="commodity">Commodity</option>
              <option value="tool">Tool</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Base price"
              value={editing.basePrice}
              onChange={(e) => setEditing((i) => ({ ...i, basePrice: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              step="0.1"
              placeholder="Volatility %"
              value={editing.volatilityPercent}
              onChange={(e) => setEditing((i) => ({ ...i, volatilityPercent: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              step="0.01"
              placeholder="Sell rate (0-1)"
              value={editing.sellRateMultiplier}
              onChange={(e) => setEditing((i) => ({ ...i, sellRateMultiplier: Number(e.target.value) }))}
            />
          </div>
          <div className="veltriz-adminpage-form-row">
            <button className="veltriz-adminpage-btn primary" disabled={saving} onClick={save}>
              <Save size={14} /> Save item
            </button>
            <button className="veltriz-adminpage-btn" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="veltriz-adminpage-card">
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Base price</th>
                <th>Live price</th>
                <th>Volatility</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>Loading…</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.key}>
                    <td>{item.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                    <td>{item.basePrice} VC</td>
                    <td style={{ fontWeight: 700 }}>{Math.round(item.currentPrice)} VC</td>
                    <td>{item.volatilityPercent}%</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="veltriz-adminpage-btn primary" onClick={() => overridePrice(item)}>
                        <Zap size={14} /> Override price
                      </button>
                      <button className="veltriz-adminpage-btn" onClick={() => setEditing({ ...item })}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketItems;
