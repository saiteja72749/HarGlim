import { Fragment } from "react";

function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|\x60[^\x60\n]+\x60)/g).map((part, index) => {
    if (/^(\*\*|__)[^\n]+\1$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** Synopsis markup is rendered as React text and elements. */
export function BookDescription({ text }: { text: string }) {
  const blocks = text.trim().replace(/\r\n/g, "\n").split(/\n[ \t]*\n/);
  return blocks.map((block, index) => {
    const lines = block.split("\n");
    const listMarker = lines.every((line) => /^[-*+]\s+/.test(line)) ? /^[-*+]\s+/
      : lines.every((line) => /^\d+\.\s+/.test(line)) ? /^\d+\.\s+/ : null;
    if (listMarker) {
      const List = /^\d/.test(block) ? "ol" : "ul";
      return <List key={index} className={List === "ol" ? "mb-4 list-decimal pl-6" : "mb-4 list-disc pl-6"}>
        {lines.map((line, item) => <li key={item}>{inline(line.replace(listMarker, ""))}</li>)}
      </List>;
    }
    const heading = /^#{1,6}\s+(.+)$/.exec(lines[0]);
    return (
      <div key={index} className="mb-4">
        {heading && <h3 className="mb-1 font-serif font-semibold text-foreground">{inline(heading[1])}</h3>}
        {(heading ? lines.length > 1 : Boolean(block)) && <p className="whitespace-pre-line">{inline(heading ? lines.slice(1).join("\n") : block)}</p>}
      </div>
    );
  });
}
