import {Fragment, type ReactNode} from 'react';
import Link from '@docusaurus/Link';

/**
 * Renders a small subset of inline Markdown used in endpoint data:
 * `code`, **bold**, and [label](href).
 */
export function inline(text: string | undefined): ReactNode {
  if (!text) {
    return null;
  }
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      return (
        <Link key={index} to={link[2]}>
          {link[1]}
        </Link>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
