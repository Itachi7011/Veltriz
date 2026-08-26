import React, { useEffect, useState } from 'react';
import { Gem, Plus, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#7c3aed' };

const emptyProduct = {
  key: '',
  name: '',
  description: '',
  shardAmount: 100,
  bonusShardAmount: 0,
  priceUSD: 1.99,
  icon: 'gem',
  isActive: true,
  sortOrder: 0,
};

/**
 * Live-tunes the Chrono Store's catalog (economy-service's PaymentProduct
 * model) without a redeploy — same "findOneAndUpdate by key, upsert"
 * pattern as MarketItems.jsx, just for shard bundles instead of tradeable
 * goods. Every purchase against these products still goes through the
 * sandbox payment provider (see economy-service's services/
 * paymentProviders/) — nothing here moves real money, this only controls
 * what's for sale and at what (fake) price.
 */
const ChronoStore = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    http
      .get('/api/economy/payment-products')
      .then(({ data: res }) => setProducts(res.products))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    try {
      await http.post('/api/economy/payment-products', editing);
      setEditing(null);
      load();
      Swal.fire({ icon: 'success', title: 'Product saved', timer: 1400, showConfirmButton: false, ...swalTheme });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message, ...swalTheme });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Gem size={22} /> Chrono Store
          </h1>
          <p className="veltriz-adminpage-subtitle">
            The Chrono Shard bundles players can buy in-game. Every purchase runs through the sandbox payment
            provider — see <strong>Purchases</strong> for the transaction log — no real card is ever charged.
          </p>
        </div>
        <button className="veltriz-adminpage-btn primary" onClick={() => setEditing({ ...emptyProduct })}>
          <Plus size={15} /> New product
        </button>
      </div>

      {editing && (
        <div className="veltriz-adminpage-card">
          <h3 style={{ marginTop: 0 }}>{products.find((p) => p.key === editing.key) ? 'Edit product' : 'New product'}</h3>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              placeholder="key (unique, e.g. 'shards_starter')"
              value={editing.key}
              onChange={(e) => setEditing((p) => ({ ...p, key: e.target.value }))}
            />
            <input
              className="veltriz-adminpage-input"
              placeholder="Name (e.g. 'Starter Pouch')"
              value={editing.name}
              onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              placeholder="Description"
              value={editing.description}
              onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
              style={{ flex: 2 }}
            />
          </div>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Shard amount"
              value={editing.shardAmount}
              onChange={(e) => setEditing((p) => ({ ...p, shardAmount: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Bonus shards (0 for none)"
              value={editing.bonusShardAmount}
              onChange={(e) => setEditing((p) => ({ ...p, bonusShardAmount: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              step="0.01"
              placeholder="Price (USD, sandbox only)"
              value={editing.priceUSD}
              onChange={(e) => setEditing((p) => ({ ...p, priceUSD: Number(e.target.value) }))}
            />
          </div>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Sort order (lower = shown first)"
              value={editing.sortOrder}
              onChange={(e) => setEditing((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Active (visible in the Chrono Store)
            </label>
          </div>

          <div className="veltriz-adminpage-form-row">
            <button className="veltriz-adminpage-btn primary" disabled={saving} onClick={save}>
              <Save size={14} /> Save product
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
                <th>Shards</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5}>Loading…</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="veltriz-adminpage-empty">
                    No products yet — run <code>npm run seed:payments</code> in economy-service, or add one above.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.key}>
                    <td>
                      <div>{p.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--vza-text-secondary)' }}>{p.description}</div>
                    </td>
                    <td>
                      {p.shardAmount}
                      {p.bonusShardAmount > 0 && <span style={{ color: '#22c55e' }}> +{p.bonusShardAmount} bonus</span>}
                    </td>
                    <td>${p.priceUSD.toFixed(2)}</td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${p.isActive ? 'active' : 'banned'}`}>
                        {p.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <button className="veltriz-adminpage-btn" onClick={() => setEditing({ ...emptyProduct, ...p })}>
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

export default ChronoStore;
