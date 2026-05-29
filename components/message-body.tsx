import React from "react";

const URL_RE = /https?:\/\/[^\s<>"')]+/g;
const LINK_PAIR_RE = /([^\s][^\n(]*?)\s\((https?:\/\/[^\s)]+)\)/g;

export function MessageBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderLine(line)}
          {i < lines.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </div>
  );
}

type Token =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string };

function renderLine(line: string): React.ReactNode {
  const tokens = tokenize(line);
  return tokens.map((t, i) => {
    if (t.type === "link") {
      return (
        <a
          key={i}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground"
        >
          {t.label}
        </a>
      );
    }
    if (t.type === "bold") {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {t.value}
        </strong>
      );
    }
    if (t.type === "italic") {
      return (
        <em key={i} className="italic">
          {t.value}
        </em>
      );
    }
    return <React.Fragment key={i}>{t.value}</React.Fragment>;
  });
}

function tokenize(line: string): Token[] {
  const pairs: { start: number; end: number; token: Token }[] = [];

  for (const m of line.matchAll(LINK_PAIR_RE)) {
    if (typeof m.index !== "number") continue;
    pairs.push({
      start: m.index,
      end: m.index + m[0].length,
      token: { type: "link", href: m[2], label: m[1] },
    });
  }

  for (const m of line.matchAll(URL_RE)) {
    if (typeof m.index !== "number") continue;
    const start = m.index;
    const end = start + m[0].length;
    if (pairs.some((p) => start >= p.start && end <= p.end)) continue;
    pairs.push({
      start,
      end,
      token: { type: "link", href: m[0], label: shortenUrlLabel(m[0]) },
    });
  }

  for (const m of line.matchAll(/\*\*([^*\n]+)\*\*/g)) {
    if (typeof m.index !== "number") continue;
    const start = m.index;
    const end = start + m[0].length;
    if (pairs.some((p) => start < p.end && end > p.start)) continue;
    pairs.push({
      start,
      end,
      token: { type: "bold", value: m[1] },
    });
  }

  for (const m of line.matchAll(/(?<!\*)\*([^*\n]+)\*(?!\*)/g)) {
    if (typeof m.index !== "number") continue;
    const start = m.index;
    const end = start + m[0].length;
    if (pairs.some((p) => start < p.end && end > p.start)) continue;
    pairs.push({
      start,
      end,
      token: { type: "italic", value: m[1] },
    });
  }

  pairs.sort((a, b) => a.start - b.start);

  const out: Token[] = [];
  let cursor = 0;
  for (const p of pairs) {
    if (p.start > cursor) {
      out.push({ type: "text", value: line.slice(cursor, p.start) });
    }
    out.push(p.token);
    cursor = p.end;
  }
  if (cursor < line.length) {
    out.push({ type: "text", value: line.slice(cursor) });
  }
  return out;
}

function shortenUrlLabel(url: string): string {
  if (url.length <= 60) return url;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return url;
  }
}
