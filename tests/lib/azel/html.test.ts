import { describe, it, expect } from 'vitest';
import { stripUnsafeHtmlKeepToggles } from '../../../app/lib/azel/html';

describe('stripUnsafeHtmlKeepToggles', () => {
  it('keeps the radio tabs of the install-centers page, with the first city checked', () => {
    const html =
      '<input type="radio" name="az-city" id="az-t1" checked><input type="radio" name="az-city" id="az-t2">' +
      '<div class="az-wrap"><label for="az-t1">الرياض</label></div>';
    expect(stripUnsafeHtmlKeepToggles(html)).toBe(
      '<input type="radio" id="az-t1" name="az-city" checked><input type="radio" id="az-t2" name="az-city">' +
        '<div class="az-wrap"><label for="az-t1">الرياض</label></div>'
    );
  });

  it('drops handlers and unsafe values from a toggle', () => {
    expect(
      stripUnsafeHtmlKeepToggles('<input type="checkbox" id="x" onfocus="steal()" autofocus value="a\'b" class="ok bad\'">')
    ).toBe('<input type="checkbox" id="x" class="ok">');
  });

  it('still removes every other input and unsafe tag', () => {
    const out = stripUnsafeHtmlKeepToggles(
      '<input type="text" name="q"><input type="hidden" value="1"><script>steal()</script><p onclick="x()">Hi</p>'
    );
    expect(out).not.toContain('<input');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('onclick');
    expect(out).toContain('Hi');
  });

  it('cannot be fooled by a marker written in the content', () => {
    expect(stripUnsafeHtmlKeepToggles('<!--azel-toggle-0--><p>x</p>')).toBe('<p>x</p>');
  });
});
