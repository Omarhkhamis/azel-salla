import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useDocumentClass } from '@salla.sa/twilight-theme-engine/hooks/useDocumentClass';
import { useLocation } from '@salla.sa/twilight-theme-engine/providers';

export type DrawerId = 'cart' | 'mnav' | 'filters' | null;

interface LayersValue {
  drawer: DrawerId;
  searchOpen: boolean;
  openDrawer: (id: Exclude<DrawerId, null>) => void;
  closeDrawers: () => void;
  toggleSearch: () => void;
}

const LayersContext = createContext<LayersValue | null>(null);

/**
 * The page's layers: the overlay, the drawers (cart, menu, filters) and the
 * search panel. One drawer at a time, Escape closes everything, and a page
 * change closes everything so a back-navigation does not restore an open drawer.
 */
export function LayersProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerId>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname, searchStr } = useLocation();

  const openDrawer = useCallback((id: Exclude<DrawerId, null>) => setDrawer(id), []);
  const closeDrawers = useCallback(() => setDrawer(null), []);
  const toggleSearch = useCallback(() => setSearchOpen((open) => !open), []);

  useEffect(() => {
    setDrawer(null);
    setSearchOpen(false);
  }, [pathname, searchStr]);

  // The page under an open drawer does not scroll.
  useDocumentClass({ body: { class: drawer ? 'lock' : [] } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setDrawer(null);
      setSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(
    () => ({ drawer, searchOpen, openDrawer, closeDrawers, toggleSearch }),
    [drawer, searchOpen, openDrawer, closeDrawers, toggleSearch]
  );

  return (
    <LayersContext.Provider value={value}>
      {children}
      <div
        className={`overlay${drawer ? ' open' : ''}`}
        id="overlay"
        aria-hidden="true"
        onClick={closeDrawers}
      />
    </LayersContext.Provider>
  );
}

export function useLayers(): LayersValue {
  const value = useContext(LayersContext);
  if (!value) throw new Error('useLayers must be used inside ThemeLayout');
  return value;
}
