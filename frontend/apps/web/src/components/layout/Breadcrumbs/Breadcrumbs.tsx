import { Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAppShellStore } from '@/store/app-shell-store';
import { BREADCRUMBS_LABEL, buildCrumbs } from './Breadcrumbs.constants';
import {
  ANCESTOR_STYLES,
  BREADCRUMBS_STYLES,
  CURRENT_STYLES,
  SEPARATOR_STYLES,
} from './Breadcrumbs.styles';

export function Breadcrumbs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const trailingLabel = useAppShellStore((state) => state.trailingCrumbLabel);
  const crumbs = buildCrumbs(pathname, trailingLabel);

  return (
    <nav aria-label={BREADCRUMBS_LABEL} className={BREADCRUMBS_STYLES}>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && (
              <ChevronRight className={`size-[13px] ${SEPARATOR_STYLES}`} aria-hidden="true" />
            )}
            {isLast || !crumb.to ? (
              <span className={CURRENT_STYLES} aria-current={isLast ? 'page' : undefined}>
                {crumb.label}
              </span>
            ) : (
              <button
                type="button"
                className={ANCESTOR_STYLES}
                onClick={() => navigate(crumb.to as string)}
              >
                {crumb.label}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
