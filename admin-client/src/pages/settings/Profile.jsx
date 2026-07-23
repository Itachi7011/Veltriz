import React from 'react';
import { UserCog } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import '../adminPages.css';

const Profile = () => {
  const { admin } = useAdminAuth();

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <UserCog size={22} /> Profile
          </h1>
          <p className="veltriz-adminpage-subtitle">Your admin account details.</p>
        </div>
      </div>

      <div className="veltriz-adminpage-card" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="veltriz-adminpage-subtitle">Username</div>
          <div style={{ fontWeight: 700 }}>{admin?.username}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="veltriz-adminpage-subtitle">Email</div>
          <div style={{ fontWeight: 700 }}>{admin?.email}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="veltriz-adminpage-subtitle">Role</div>
          <span className="veltriz-adminpage-badge active">{admin?.role}</span>
        </div>
        <div>
          <div className="veltriz-adminpage-subtitle">Member since</div>
          <div>{admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}</div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
