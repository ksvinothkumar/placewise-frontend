import { useEffect } from 'react';

/** Sets the page title, description and optional JSON-LD while mounted, then restores them. */
export function useHead({ title, description, jsonLd }: { title: string; description?: string; jsonLd?: unknown }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    const prevDesc = meta?.content ?? '';
    if (description) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
    let script: HTMLScriptElement | undefined;
    if (ld) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = ld.replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }
    return () => {
      document.title = prevTitle;
      script?.remove();
      if (description && meta) {
        if (created) meta.remove();
        else meta.content = prevDesc;
      }
    };
  }, [title, description, ld]);
}
