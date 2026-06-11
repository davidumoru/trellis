import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 60,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.45,
    color: "#1a1a1a",
  },
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: 17,
    marginBottom: 6,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 14,
    marginBottom: 5,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: "#d4d4d4",
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    marginTop: 9,
    marginBottom: 3,
  },
  paragraph: {
    marginBottom: 6,
  },
  listRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  listMarker: {
    width: 14,
  },
  listText: {
    flex: 1,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
});

type Block =
  | { kind: "h1" | "h2" | "h3" | "p"; text: string }
  | { kind: "list"; items: { marker: string; text: string }[] };

export async function renderDocumentPdf(content: string): Promise<Uint8Array> {
  const blocks = parseBlocks(content);
  const buffer = await renderToBuffer(
    <Document>
      <Page size="LETTER" style={styles.page}>
        {blocks.map((block, i) => renderBlock(block, i))}
      </Page>
    </Document>,
  );
  return new Uint8Array(buffer);
}

function renderBlock(block: Block, key: number) {
  if (block.kind === "list") {
    return (
      <View key={key} style={styles.paragraph}>
        {block.items.map((item, j) => (
          <View key={j} style={styles.listRow} wrap={false}>
            <Text style={styles.listMarker}>{item.marker}</Text>
            <Text style={styles.listText}>{inlineRuns(item.text)}</Text>
          </View>
        ))}
      </View>
    );
  }
  const style =
    block.kind === "h1"
      ? styles.h1
      : block.kind === "h2"
        ? styles.h2
        : block.kind === "h3"
          ? styles.h3
          : styles.paragraph;
  return (
    <Text key={key} style={style}>
      {inlineRuns(block.text)}
    </Text>
  );
}

function inlineRuns(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <Text key={i} style={styles.bold}>
          {bold[1]}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

function parseBlocks(content: string): Block[] {
  const lines = cleanup(content).split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { marker: string; text: string }[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({ kind: "list", items: list });
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const kind = (["h1", "h2", "h3"] as const)[heading[1].length - 1];
      blocks.push({ kind, text: stripMd(heading[2]) });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      list.push({ marker: "•", text: bullet[1] });
      continue;
    }
    const ordered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      list.push({ marker: `${ordered[1]}.`, text: ordered[2] });
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

function cleanup(content: string): string {
  return content
    .replace(/```[a-z]*\n?/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function stripMd(text: string): string {
  return text.replace(/\*\*/g, "");
}
