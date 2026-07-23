import React from 'react';
import { useSidebar } from '../../context/SidebarContext';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const { isExpanded } = useSidebar();

  return (
    <div className="veltriz-adminlayout">
      <AdminSidebar />
      <AdminNavbar />
      <main
        className="veltriz-adminlayout-content"
        style={{
          marginLeft: isExpanded ? 'var(--vza-sidebar-width-expanded)' : 'var(--vza-sidebar-width-collapsed)',
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
