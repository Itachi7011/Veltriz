import React, { useEffect, useState, useCallback } from 'react';
import { X, Gem, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

/**
 * The Chrono Store — where Chrono Shards are bought. Every purchase goes
 * through economy-service's /api/payments/checkout, which runs it through
 * whichever PaymentProvider is active (sandboxProvider.js today — no real
 * money ever moves; see that file for the "how this becomes real later"
 * plan). This panel has zero knowledge of that detail — it just posts a
 * productKey and shows the result, exactly as it would against a real
 * gateway later.
 */
const ChronoStorePanel = ({ onClose }) => {
  const [products, setProducts] = useState([]);
  const [chronoShards, setChronoShards] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: productsRes }, { data: walletRes }] = await Promise.all([
      http.get('/api/payments/products'),
      http.get('/api/wallet/me'),
    ]);
    setProducts(productsRes.products);
    setChronoShards(walletRes.wallet?.chronoShards || 0);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async (product) => {
    const confirm = await Swal.fire({
      icon: 'info',
      title: `Buy ${product.name}?`,
      html: `This is a <strong>test/sandbox purchase</strong> — no real card is charged.<br/>$${product.priceUSD.toFixed(2)} → ${product.shardAmount + product.bonusShardAmount} Chrono Shards`,
      showCancelButton: true,
      confirmButtonText: 'Confirm test purchase',
      confirmButtonColor: '#7c3aed',
    });
    if (!confirm.isConfirmed) return;

    setBusyKey(product.key);
    try {
      const { data: res } = await http.post('/api/payments/checkout', { productKey: product.key });
      Swal.fire({ icon: 'success', title: res.message, timer: 2000, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Purchase failed', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Gem size={20} /> Chrono Store
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#9ca0c2' }}>
          You have <strong>{chronoShards}</strong> Chrono Shards. Spend them to skip a job shift's wait or clear a
          crime cooldown early.
        </p>
        <p style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>
          <CreditCard size={12} /> Sandbox mode — every purchase here is simulated, no real payment is processed.
        </p>

        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="veltriz-game-market-list">
            {products.map((p) => (
              <div key={p.key} className="veltriz-game-market-card">
                <div className="veltriz-game-market-info">
                  <div className="veltriz-game-market-name">{p.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca0c2' }}>{p.description}</div>
                  <div className="veltriz-game-market-price">
                    <Gem size={13} /> {p.shardAmount}
                    {p.bonusShardAmount > 0 && <span style={{ color: '#22c55e' }}> +{p.bonusShardAmount} bonus</span>}
                  </div>
                </div>
                <div className="veltriz-game-market-actions">
                  <button className="veltriz-game-btn primary" disabled={busyKey === p.key} onClick={() => buy(p)}>
                    ${p.priceUSD.toFixed(2)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChronoStorePanel;
