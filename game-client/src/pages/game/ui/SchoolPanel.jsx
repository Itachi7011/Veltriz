import React, { useEffect, useState, useCallback } from 'react';
import { X, GraduationCap } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const SchoolPanel = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get('/api/school/me');
    setStatus(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const study = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/school/study');
      Swal.fire({ icon: 'success', title: res.message, timer: 2200, showConfirmButton: false });
      await load();
    } catch (err) {
      if (err.response?.status === 429) {
        Swal.fire({ icon: 'info', title: err.response.data.message });
      } else {
        Swal.fire({ icon: 'error', title: 'Could not enroll', text: err.response?.data?.message });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <GraduationCap size={20} /> Veltriz School
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!status ? (
          <p>Loading…</p>
        ) : (
          <>
            <p>
              Each course is a permanent, one-time boost to every job's salary — pay tuition once, keep the raise
              forever.
            </p>
            <p style={{ margin: '14px 0' }}>
              Skill level: <strong>{status.skillLevel}/{status.maxSkillLevel}</strong> ({status.salaryBonusPercent}%
              salary bonus)
            </p>
            {status.skillLevel >= status.maxSkillLevel ? (
              <p style={{ opacity: 0.7 }}>You've completed every course available.</p>
            ) : (
              <button className="veltriz-game-btn primary" disabled={isBusy} onClick={study}>
                {isBusy ? 'Enrolling…' : `Enroll (${status.nextTuition} VC)`}
              </button>
            )}
            {status.cooldownRemainingSeconds > 0 && (
              <p style={{ opacity: 0.7, fontSize: '0.85em', marginTop: 10 }}>
                Next class starts in ~{Math.ceil(status.cooldownRemainingSeconds / 60)} min.
              </p>
            )}
          </>
        )}
        <LocationCareers locationType="school" />
      </div>
    </div>
  );
};

export default SchoolPanel;
