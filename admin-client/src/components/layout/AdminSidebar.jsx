import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { NAV_CONFIG } from './navConfig';
import './AdminSidebar.css';

const SidebarNode = ({ node, depth, isExpanded, activePath }) => {
  const [open, setOpen] = useState(false);
  const Icon = node.icon;
  const hasChildren = !!node.children;
  const isActive = node.path && activePath.startsWith(node.path.split('?')[0]) && node.path !== '/';
  const isHome = node.path === '/' && activePath === '/';

  if (!hasChildren) {
    return (
      <li className="veltriz-adminsidebar-item-wrap">
        <Link
          to={node.path}
          className={`veltriz-adminsidebar-item ${isActive || isHome ? 'active' : ''}`}
          style={{ paddingLeft: 16 + depth * 14 }}
          title={!isExpanded ? node.label : undefined}
        >
          <Icon size={19} className="veltriz-adminsidebar-icon" />
          {isExpanded && <span className="veltriz-adminsidebar-label">{node.label}</span>}
        </Link>
      </li>
    );
  }

  return (
    <li className="veltriz-adminsidebar-item-wrap">
      <button
        type="button"
        className="veltriz-adminsidebar-item veltriz-adminsidebar-group-btn"
        style={{ paddingLeft: 16 + depth * 14 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={!isExpanded ? node.label : undefined}
      >
        <Icon size={19} className="veltriz-adminsidebar-icon" />
        {isExpanded && (
          <>
            <span className="veltriz-adminsidebar-label">{node.label}</span>
            <ChevronDown
              size={15}
              className={`veltriz-adminsidebar-chevron ${open ? 'open' : ''}`}
            />
          </>
        )}
      </button>

      {isExpanded && (
        <ul
          className="veltriz-adminsidebar-submenu"
          style={{ maxHeight: open ? node.children.length * 46 + 200 : 0 }}
        >
          {node.children.map((child) => (
            <SidebarNode
              key={child.label}
              node={child}
              depth={depth + 1}
              isExpanded={isExpanded}
              activePath={activePath}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const AdminSidebar = () => {
  const { isExpanded, toggleSidebar } = useSidebar();
  const location = useLocation();

  return (
    <aside className={`veltriz-adminsidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="veltriz-adminsidebar-brand">
        <Sparkles size={22} className="veltriz-adminsidebar-brand-icon" />
        {isExpanded && <span className="veltriz-adminsidebar-brand-text">VELTRIZ ADMIN</span>}
      </div>

      <nav className="veltriz-adminsidebar-nav" aria-label="Admin navigation">
        <ul className="veltriz-adminsidebar-list">
          {NAV_CONFIG.map((node) => (
            <SidebarNode
              key={node.label}
              node={node}
              depth={0}
              isExpanded={isExpanded}
              activePath={location.pathname}
            />
          ))}
        </ul>
      </nav>

      <button
        type="button"
        className="veltriz-adminsidebar-toggle"
        onClick={toggleSidebar}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </aside>
  );
};

export default AdminSidebar;
