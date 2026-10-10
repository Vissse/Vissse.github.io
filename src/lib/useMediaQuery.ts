import { useEffect, useState } from 'react';

// Whether a CSS media query currently matches, kept up to date.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    // Also on resize: cheap, and it can't miss a change the query's own
    // event didn't deliver.
    window.addEventListener('resize', onChange);
    return () => {
      list.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, [query]);

  return matches;
}
