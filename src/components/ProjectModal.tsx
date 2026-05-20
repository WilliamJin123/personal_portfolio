import { useEffect, useRef } from 'react';
import './ProjectModal.css';

/**
 * Full-screen modal for project / work entry detail.
 *
 * Mounts once on the home page as a client island. Hooks into document clicks:
 *  - Card click ([data-card-slug]) → push /work/[slug] and open modal
 *  - In-modal link to /work/[other-slug] (prev/next) → swap content, push state
 *  - In-modal link to "/" → close modal
 *
 * Content is sourced from <template id="pc-[slug]"> elements which the home
 * page pre-renders for every project. The modal clones those templates into
 * the dialog body, so opening is instant (no fetch).
 *
 * History: pushState on open, history.back() on close — back button closes,
 * forward button reopens, direct visits to /work/[slug] still hit the static
 * standalone page.
 */
export default function ProjectModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  function showFor(slug: string) {
    const tpl = document.getElementById(`pc-${slug}`) as HTMLTemplateElement | null;
    const dialog = dialogRef.current;
    const body = bodyRef.current;
    if (!tpl || !dialog || !body) return;

    body.innerHTML = '';
    body.appendChild(tpl.content.cloneNode(true));
    dialog.scrollTop = 0;

    if (!dialog.open) {
      dialog.showModal();
    }
    document.body.classList.add('modal-open');
  }

  function close() {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }

  function pushAndShow(slug: string) {
    if (window.history.state?.modal !== slug) {
      window.history.pushState({ modal: slug }, '', `/work/${slug}`);
    }
    showFor(slug);
  }

  useEffect(() => {
    const dialog = dialogRef.current;

    // If a deep link was used with a hash referring to a slug, this is where
    // you could auto-open. We don't do that today — direct /work/[slug] URLs
    // still hit the standalone page (this controller only runs on the home page).

    const onClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const target = (e.target as HTMLElement).closest(
        '[data-card-slug], a'
      ) as HTMLElement | null;
      if (!target) return;

      // Cards on the home page
      if (target.hasAttribute('data-card-slug')) {
        e.preventDefault();
        pushAndShow(target.getAttribute('data-card-slug')!);
        return;
      }

      // Only intercept other anchor clicks when the modal is showing
      if (!document.body.classList.contains('modal-open')) return;

      const href = target.getAttribute('href') || '';
      const workMatch = href.match(/^\/work\/([^/?#]+)/);
      if (workMatch) {
        e.preventDefault();
        pushAndShow(workMatch[1]);
        return;
      }
      if (href === '/' || href.startsWith('/#')) {
        e.preventDefault();
        close();
      }
    };

    const onPopState = (e: PopStateEvent) => {
      const slug = e.state?.modal;
      if (slug) {
        showFor(slug);
      } else {
        close();
      }
    };

    const onDialogClose = () => {
      // Restore URL if we had pushed a modal state
      if (window.history.state?.modal) {
        window.history.back();
      }
      document.body.classList.remove('modal-open');
    };

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPopState);
    dialog?.addEventListener('close', onDialogClose);

    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPopState);
      dialog?.removeEventListener('close', onDialogClose);
    };
  }, []);

  // Click on the backdrop area (outside the body) closes
  const onDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      close();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="project-modal"
      onClick={onDialogClick}
      aria-label="Project detail"
    >
      <button
        type="button"
        className="modal-close"
        onClick={close}
        aria-label="Close"
      >
        ✕
      </button>
      <div ref={bodyRef} className="modal-body" />
    </dialog>
  );
}
