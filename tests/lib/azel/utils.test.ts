import { describe, it, expect } from 'vitest';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import {
  collection,
  hexColor,
  linkUrl,
  localizeDigits,
  parseLinks,
  pick,
  plainText,
  visibleProducts,
} from '../../../app/lib/azel/utils';

describe('azel utils', () => {
  it('reads a dropdown as a string or [{ value }]', () => {
    expect(pick('cover')).toBe('cover');
    expect(pick([{ value: 'contain', label: 'x' }])).toBe('contain');
    expect(pick([])).toBeUndefined();
  });

  it('reads a variable-list link in each shape it arrives in', () => {
    expect(linkUrl(' /a ')).toBe('/a');
    expect(linkUrl({ url: '/b' })).toBe('/b');
    expect(linkUrl([{ value: '/c' }])).toBe('/c');
    expect(linkUrl([])).toBe('');
  });

  it('unprefixes collection items from twilight.json defaults', () => {
    expect(collection([{ 'tiles.name': 'A', url: '/a' }], 'tiles')).toEqual([{ name: 'A', url: '/a' }]);
    expect(collection(undefined, 'tiles')).toEqual([]);
  });

  it('parses "text | link" lines', () => {
    expect(parseLinks('Home | /\r\n\n Warranty|https://w.test \nNo link')).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Warranty', url: 'https://w.test' },
      { label: 'No link', url: '#' },
    ]);
  });

  it('turns merchant HTML into plain text, entity-encoded tags included', () => {
    expect(plainText('<p>One</p>&lt;b&gt;Two&lt;/b&gt;&nbsp;&amp; three')).toBe('One Two & three');
  });

  it('accepts only plain hex colours for the inline style', () => {
    expect(hexColor(' #ABCDEF ')).toBe('#abcdef');
    expect(hexColor('#abc')).toBe('#abc');
    expect(hexColor('red;}body{display:none')).toBeNull();
    expect(hexColor('#abcd')).toBeNull();
  });

  it('writes Arabic digits when the store asks for them', () => {
    expect(localizeDigits('12%', true)).toBe('١٢%');
    expect(localizeDigits('12%', false)).toBe('12%');
  });

  it('drops sold-out products only when hide_sold_out is on', () => {
    const items = [
      { id: 1, is_available: true, is_out_of_stock: false },
      { id: 2, is_available: true, is_out_of_stock: true },
      { id: 3, is_available: false, is_out_of_stock: false },
    ] as unknown as Product[];
    expect(visibleProducts(items, true).map((p) => p.id)).toEqual([1]);
    expect(visibleProducts(items, false)).toHaveLength(3);
  });
});
