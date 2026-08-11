import { PLACEHOLDER_NOTE } from './PagePlaceholder.constants';
import {
  CONTAINER_STYLES,
  DESCRIPTION_STYLES,
  PANEL_STYLES,
  TITLE_STYLES,
} from './PagePlaceholder.styles';

interface PagePlaceholderProps {
  title: string;
  description: string;
}

/** Stub body for routes whose real content lands in a later redesign segment. */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className={CONTAINER_STYLES}>
      <h1 className={TITLE_STYLES}>{title}</h1>
      <p className={DESCRIPTION_STYLES}>{description}</p>
      <div className={PANEL_STYLES}>{PLACEHOLDER_NOTE}</div>
    </div>
  );
}
