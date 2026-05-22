import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from './Markdown';

// 13.3 — guards the XSS-safety invariant of the in-house Markdown renderer:
// LLM-supplied text must never reach the DOM as live HTML.
describe('Markdown XSS safety', () => {
  it('renders an injected <img onerror> as escaped, inert text', () => {
    const html = renderToStaticMarkup(
      <Markdown source={'A node says <img src=x onerror="alert(1)">'} />,
    );
    // The tag must be HTML-escaped, not emitted as a real element.
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror="alert(1)"');
  });

  it('renders an injected <script> as escaped text', () => {
    const html = renderToStaticMarkup(
      <Markdown source={'<script>alert(1)</script>'} />,
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('still renders ordinary markdown structure', () => {
    const html = renderToStaticMarkup(
      <Markdown source={'# Title\n\n- one\n- two'} />,
    );
    expect(html).toContain('<h1');
    expect(html).toContain('<li>one</li>');
  });

  it('renders an http(s) citation link as an anchor', () => {
    const html = renderToStaticMarkup(
      <Markdown source={'See [the source](https://example.com/x).'} />,
    );
    expect(html).toContain('href="https://example.com/x"');
    expect(html).toContain('the source');
  });

  it('neutralises a javascript: link href (15 / 13.3)', () => {
    const html = renderToStaticMarkup(
      <Markdown source={'[click](javascript:alert(1))'} />,
    );
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });
});
