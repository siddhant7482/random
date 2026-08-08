import { Fragment, type ReactNode } from "react";

/**
 * The tiniest possible inline formatter, so config.ts can stay plain text.
 *
 * Supports **bold**, _italic_, and a literal \n for a line break. That is the
 * entire grammar — anything more and the content should move into a component.
 */
export function rich(text: string): ReactNode {
  return text.split("\n").map((line, li, lines) => (
    <Fragment key={li}>
      {inline(line)}
      {li < lines.length - 1 && <br />}
    </Fragment>
  ));
}

function inline(line: string): ReactNode {
  // one pass, alternating between plain text and the captured markers
  const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.length > 1 && part.startsWith("_") && part.endsWith("_")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
