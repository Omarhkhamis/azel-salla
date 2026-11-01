import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { product } from '@salla.sa/twilight-theme-engine/api/product';
import { Image, Link } from '@salla.sa/twilight-theme-engine/common';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useNavigate } from '@salla.sa/twilight-theme-engine/providers';
import { AzLink } from '../azel/AzLink';
import { Icon } from '../azel/Icon';
import { useSettings } from '../azel/useAzel';
import { useLayers } from './Layers';
import { parseLinks } from '../../lib/azel/utils';
import type { Product } from '@salla.sa/twilight-theme-engine/types';

function SearchResult({ item }: { item: Product }) {
  const { format } = useMoney();
  const price = item.is_on_sale ? item.sale_price : (item.price ?? item.starting_price);
  return (
    <Link to={item.url}>
      <Image src={item.image?.url} alt="" srcSetWidths={[120]} sizes="56px" />
      <span>
        <span className="n">{item.name}</span>
        <span className="c">{item.category?.name ?? ''}</span>
      </span>
      <span className="price">{format(price as number)}</span>
    </Link>
  );
}

/** Toggles from the header's search button; live results from two letters on. */
export function SearchPanel() {
  const { t } = useTranslation();
  const get = useSettings();
  const navigate = useNavigate();
  const { searchOpen } = useLayers();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Typing settles for 250ms before a request goes out.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setQuery('');
      return;
    }
    const timer = setTimeout(() => setQuery(q), 250);
    return () => clearTimeout(timer);
  }, [value]);

  const { data, isSuccess, isError } = useQuery({
    ...product.queries.list({ source: 'search', keyword: query, perPage: 5 }),
    enabled: !!query,
  });
  const results = query && isSuccess ? (data?.items ?? []).slice(0, 5) : [];
  const none = !!query && (isError || (isSuccess && results.length === 0));
  const searchUrl = `/search?q=${encodeURIComponent(query)}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const tags = parseLinks(get('search_tags', ''), '');

  return (
    <div className={`search-panel${searchOpen ? ' open' : ''}`} id="search-panel">
      <div className="container">
        <form className="search-field" action="/search" method="get" role="search" onSubmit={submit}>
          <Icon name="search" />
          <input
            ref={inputRef}
            type="search"
            name="q"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={get<string>('search_placeholder') || t('azel.search.placeholder')}
            aria-label={t('azel.common.search')}
          />
        </form>
        {tags.length > 0 && (
          <div className="search-tags">
            <span>{t('azel.search.popular')}</span>
            {tags.map((tag) => (
              <AzLink key={tag.label} href={tag.url || `/search?q=${encodeURIComponent(tag.label)}`}>
                {tag.label}
              </AzLink>
            ))}
          </div>
        )}
        <div className="search-res" id="search-res">
          {results.map((item) => (
            <SearchResult key={item.id} item={item} />
          ))}
          {results.length > 0 && (
            <Link className="s-all" to={searchUrl}>
              {t('azel.search.all_results')} <Icon name="arrowL" className="i-sm i-flip" />
            </Link>
          )}
          {none && <div className="s-none">{t('azel.search.none').replace(':q', query)}</div>}
        </div>
      </div>
    </div>
  );
}
