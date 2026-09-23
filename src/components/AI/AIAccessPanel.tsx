import { useCallback, useEffect, useRef, useState } from 'react';
import { getAIStatus, verifyAIAccess } from '../../services/aiService';
import type { AIStatus } from '../../services/aiService';

type Turnstile = {
  render: (element: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; 'error-callback': () => void; 'expired-callback': () => void }) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
let scriptPromise: Promise<void> | null = null;
function loadChallenge() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const fail = () => { window.clearTimeout(timeout); scriptPromise = null; script.remove(); reject(new Error('Verification could not load. Please try again.')); };
    const timeout = window.setTimeout(fail, 12_000);
    script.onload = () => { window.clearTimeout(timeout); resolve(); };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function AIAccessPanel({ onReady }: { onReady?: () => void }) {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const refresh = useCallback(async () => {
    const next = await getAIStatus(true);
    setStatus(next);
    if (next.sessionReady) onReadyRef.current?.();
  }, []);
  useEffect(() => {
    let disposed = false;
    getAIStatus().then((next) => { if (!disposed) setStatus(next); });
    return () => { disposed = true; };
  }, []);
  useEffect(() => {
    if (!verifying || !status?.siteKey || !container.current) return;
    let disposed = false;
    let widget: string | undefined;
    const sitekey = status.siteKey;
    loadChallenge().then(() => {
      if (disposed || !container.current || !window.turnstile) return;
      widget = window.turnstile.render(container.current, {
        sitekey, action: 'ai-access',
        callback: (token) => {
          verifyAIAccess(token).then(async () => {
            if (disposed) return;
            await refresh();
            setVerifying(false);
          }).catch((err: unknown) => {
            if (!disposed) { setError(err instanceof Error ? err.message : 'Verification failed.'); setVerifying(false); }
          });
        },
        'error-callback': () => { if (!disposed) { setError('Verification failed. Please try again.'); setVerifying(false); } },
        'expired-callback': () => { if (!disposed) { setError('Verification expired. Please try again.'); setVerifying(false); } },
      });
    }).catch((err: unknown) => { if (!disposed) { setError(err instanceof Error ? err.message : 'Verification unavailable.'); setVerifying(false); } });
    return () => { disposed = true; if (widget) window.turnstile?.remove(widget); };
  }, [verifying, status?.siteKey, refresh]);
  return (
    <div className="ai-access-panel">
      <p>AI sends your selected planning settings and messages to OpenAI when you request help. Avoid personal or sensitive information. Access verification uses Cloudflare.</p>
      <p role="status">{status === null ? 'Checking AI availability…' : !status.ready ? 'AI is temporarily unavailable. Planning works without AI.' : status.sessionReady ? 'AI access verified for this browser for up to 30 minutes.' : 'Verify access before requesting AI help.'}</p>
      {status?.ready && <button type="button" onClick={() => { setError(''); setVerifying(true); }} disabled={verifying}>{verifying ? 'Verifying…' : status.sessionReady ? 'Renew AI access' : 'Verify AI access'}</button>}
      {!status?.ready && <button type="button" onClick={() => void refresh()}>Retry availability</button>}
      <div ref={container} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
