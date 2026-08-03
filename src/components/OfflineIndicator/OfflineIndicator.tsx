import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import './OfflineIndicator.css';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-indicator" role="status" aria-live="polite">
      <span className="offline-indicator-icon">📡</span>
      <span className="offline-indicator-text">
        You're offline — plans work, but holiday data may be stale
      </span>
    </div>
  );
}
