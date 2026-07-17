import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * CYBERSEC — the MOTHER deck.
 * Entering CYBERSEC is a full takeover: the green MU/TH/UR 6000 deck fills the
 * viewport, replacing the Athena bridge entirely. The deck (a self-contained
 * page under /cyber/) boots into MOTHER and, when the operator crosses back,
 * posts an "athena-return" message that returns us to the bridge.
 */
interface Props {
  onReturn: () => void;
}

export function CybersecDeck({ onReturn }: Props) {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'athena-return') onReturn();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onReturn]);

  // Portal to <body> so the fixed full-screen overlay escapes the bridge's
  // CRT transform/filter ancestors (which would otherwise clip it).
  return createPortal(
    <div className="cyber-takeover">
      <iframe
        src="/cyber/mother-deck.html"
        title="MOTHER — Cybersec Deck"
        className="cyber-takeover__frame"
      />
    </div>,
    document.body,
  );
}
