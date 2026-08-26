import React, { useEffect, useState, useCallback } from 'react';
import { X, Banknote } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const CreditUnionPanel = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [borrowAmount, setBorrowAmount] = useState(500);
  const [repayAmount, setRepayAmount] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get('/api/creditunion/me');
    setStatus(data);
    if (data.loan) setRepayAmount(data.loan.balance);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const borrow = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/creditunion/borrow', { amount: borrowAmount });
      Swal.fire({ icon: 'success', title: res.message, timer: 2200, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not borrow', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const repay = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/creditunion/repay', { amount: repayAmount });
      Swal.fire({ icon: 'success', title: res.message, timer: 2200, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not repay', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Banknote size={20} /> Veltriz Credit Union
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!status ? (
          <p>Loading…</p>
        ) : status.loan ? (
          <>
            <p>
              Current balance: <strong>{status.loan.balance} VC</strong> (borrowed {status.loan.principal} VC,
              +{status.loan.interestRatePercent}% interest hourly until repaid).
            </p>
            <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
              <input
                type="number"
                min={1}
                max={status.loan.balance}
                className="veltriz-game-market-qty"
                value={repayAmount}
                onChange={(e) => setRepayAmount(Number(e.target.value))}
              />
              <button className="veltriz-game-btn primary" disabled={isBusy} onClick={repay}>
                Repay
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Borrow up to {status.maxLoanAmount} VC. No credit-score system yet — anyone can borrow up to the flat cap, once.</p>
            <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
              <input
                type="number"
                min={1}
                max={status.maxLoanAmount}
                className="veltriz-game-market-qty"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(Number(e.target.value))}
              />
              <button className="veltriz-game-btn primary" disabled={isBusy} onClick={borrow}>
                Borrow
              </button>
            </div>
            <p style={{ opacity: 0.6, fontSize: '0.8em' }}>+{status.accrualRatePercent}% interest accrues hourly until repaid.</p>
          </>
        )}
        <LocationCareers locationType="credit_union" />
      </div>
    </div>
  );
};

export default CreditUnionPanel;
