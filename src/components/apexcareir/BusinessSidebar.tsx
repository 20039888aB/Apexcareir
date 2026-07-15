import { ChevronDown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import type { NavGroup } from '../../data/businessNav';
import { useSidebarNavigation } from '../../hooks/useSidebarNavigation';
import type { SidebarNavigationMode } from '../../store/authStore';

type BusinessSidebarProps = {
  groups: NavGroup[];
  navigationMode: SidebarNavigationMode;
  onNavigate?: () => void;
};

function isChildActive(pathname: string, childPath: string) {
  return pathname === childPath || pathname.startsWith(`${childPath}/`);
}

export default function BusinessSidebar({ groups, navigationMode, onNavigate }: BusinessSidebarProps) {
  const { pathname } = useLocation();
  const visibleGroupIds = groups.map((group) => group.id);
  const { toggleGroup, isGroupExpanded } = useSidebarNavigation({
    mode: navigationMode,
    pathname,
    visibleGroupIds,
  });

  return (
    <nav className="apex-sidebar-nav-menu min-w-0 space-y-1 p-3 lg:min-w-max" aria-label="Main navigation">
      {groups.map((group) => {
        const expanded = isGroupExpanded(group.id);
        const hasActiveChild = group.children.some((child) => isChildActive(pathname, child.to));

        return (
          <div key={group.id} className="apex-nav-group">
            <button
              type="button"
              className={`apex-nav-group-toggle w-full ${hasActiveChild ? 'apex-nav-group-toggle-active' : ''}`}
              onClick={() => toggleGroup(group.id)}
              aria-expanded={expanded}
              aria-controls={`nav-group-${group.id}`}
            >
              <span>{group.label}</span>
              <ChevronDown
                size={16}
                className={`apex-nav-chevron shrink-0 ${expanded ? 'apex-nav-chevron-expanded' : ''}`}
                aria-hidden
              />
            </button>

            <div
              id={`nav-group-${group.id}`}
              className={`apex-nav-children ${expanded ? 'apex-nav-children-expanded' : ''}`}
            >
              <div className="apex-nav-children-inner">
                <div className="apex-nav-sublink-list space-y-0.5 py-1">
                  {group.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `apex-nav-sublink ${isActive ? 'apex-nav-sublink-active' : ''}`
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
