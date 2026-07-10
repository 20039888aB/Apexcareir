import { useCallback, useEffect, useMemo, useState } from 'react';
import { findActiveGroupId } from '../data/businessNav';
import type { SidebarNavigationMode } from '../store/authStore';

type UseSidebarNavigationOptions = {
  mode: SidebarNavigationMode;
  pathname: string;
  visibleGroupIds: string[];
};

export function useSidebarNavigation({ mode, pathname, visibleGroupIds }: UseSidebarNavigationOptions) {
  const activeGroupId = useMemo(
    () => findActiveGroupId(pathname, visibleGroupIds),
    [pathname, visibleGroupIds],
  );

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = activeGroupId ? [activeGroupId] : [];
    return new Set(initial);
  });

  useEffect(() => {
    if (!activeGroupId) {
      return;
    }
    setExpandedGroups((previous) => {
      if (previous.has(activeGroupId)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(activeGroupId);
      return next;
    });
  }, [activeGroupId]);

  const toggleGroup = useCallback(
    (groupId: string) => {
      setExpandedGroups((previous) => {
        const isExpanded = previous.has(groupId);

        if (mode === 'accordion') {
          if (isExpanded) {
            return new Set<string>();
          }
          return new Set([groupId]);
        }

        const next = new Set(previous);
        if (isExpanded) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    },
    [mode],
  );

  const isGroupExpanded = useCallback((groupId: string) => expandedGroups.has(groupId), [expandedGroups]);

  return {
    expandedGroups,
    toggleGroup,
    isGroupExpanded,
    activeGroupId,
  };
}
