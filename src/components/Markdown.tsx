import type { JSX, ReactNode } from 'react';

// Minimal GitHub-flavoured Markdown renderer — headings, bold/italic/inline
// code, bullet/ordered lists, pipe tables, blockquotes and rules. Written in
//-house so the app pulls in no Markdown dependency (CLAUDE.md §3).

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|~~[^~]+~~)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('~~')) {
      nodes.push(
        <span key={key++} className="line-through opacity-70">
          {tok.slice(2, -2)}
        </span>,
      );
    } else if (tok.startsWith('`')) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const HEADING_CLASS: Record<number, string> = {
  1: 'mt-6 mb-3 text-xl font-bold',
  2: 'mt-5 mb-2 border-b pb-1 text-lg font-semibold',
  3: 'mt-4 mb-1.5 text-base font-semibold',
  4: 'mt-3 mb-1 text-sm font-semibold uppercase tracking-wide',
};

const isTableRow = (l: string): boolean => /^\s*\|.*\|\s*$/.test(l);
const isListItem = (l: string): boolean =>
  /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l);
const isHeading = (l: string): boolean => /^#{1,4}\s+/.test(l.trim());
const isRule = (l: string): boolean => /^(-{3,}|\*{3,}|_{3,})$/.test(l.trim());

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      blocks.push(
        <Tag key={key++} className={HEADING_CLASS[level]}>
          {renderInline(heading[2])}
        </Tag>,
      );
      i++;
      continue;
    }

    if (isRule(trimmed)) {
      blocks.push(<hr key={key++} className="my-4 border-border" />);
      i++;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-3 border-l-2 border-border pl-3 text-sm text-muted-foreground"
        >
          {renderInline(quote.join(' '))}
        </blockquote>,
      );
      continue;
    }

    if (
      isTableRow(line) &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])
    ) {
      const rows: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      const header = tableCells(rows[0]);
      const body = rows.slice(2).map(tableCells);
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th
                    key={ci}
                    className="border border-border bg-muted/50 px-2 py-1 text-left font-semibold"
                  >
                    {renderInline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className="border border-border px-2 py-1 align-top"
                    >
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (isListItem(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && isListItem(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag
          key={key++}
          className={
            ordered
              ? 'my-2 list-decimal space-y-0.5 pl-5 text-sm'
              : 'my-2 list-disc space-y-0.5 pl-5 text-sm'
          }
        >
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !isHeading(lines[i]) &&
      !isTableRow(lines[i]) &&
      !isListItem(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !isRule(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 text-sm leading-relaxed">
        {renderInline(para.join(' '))}
      </p>,
    );
  }

  return <div className="text-foreground">{blocks}</div>;
}
