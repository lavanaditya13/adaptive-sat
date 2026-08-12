import { Fragment } from 'react';
import { InlineMath } from 'react-katex';
import {
  ESCAPED_DOLLAR_PLACEHOLDER,
  ESCAPED_DOLLAR_PLACEHOLDER_REGEX,
  ESCAPED_DOLLAR_REGEX,
  MATH_SEGMENT_REGEX,
} from './MathText.constants';

interface MathTextProps {
  text: string;
}

/** Renders question/answer/explanation text, interpreting `$...$` spans as
 *  LaTeX math (via KaTeX) and leaving everything else as plain text.
 *  `\$` in the source escapes a literal dollar sign (e.g. currency amounts)
 *  so it isn't mistaken for a math delimiter. */
export function MathText({ text }: MathTextProps) {
  const withPlaceholders = text.replace(ESCAPED_DOLLAR_REGEX, ESCAPED_DOLLAR_PLACEHOLDER);
  const segments = withPlaceholders.split(MATH_SEGMENT_REGEX);

  return (
    <>
      {segments.map((segment, index) =>
        index % 2 === 1 ? (
          <InlineMath key={index} math={segment} settings={{ throwOnError: false }} />
        ) : (
          <Fragment key={index}>
            {segment.replace(ESCAPED_DOLLAR_PLACEHOLDER_REGEX, '$')}
          </Fragment>
        )
      )}
    </>
  );
}
