import { useEffect, useRef, useState } from 'react';
import { generateShareUrl, copyToClipboard } from '../../services/shareService';
import type { HolidayPlan } from '../../utils/types';
import './ShareModal.css';

interface ShareModalProps {
  plan: HolidayPlan;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export const ShareModal = ({ plan, onClose }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = generateShareUrl(plan);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusables = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="share-modal-header">
          <h3 id="share-modal-title">Share Plan: {plan.name}</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close share dialog">
            ×
          </button>
        </div>

        <div className="share-modal-content">
          <p className="share-description">
            Copy the link below to share this holiday plan with others. Anyone with the link can view and import the plan.
          </p>

          <div className="share-url-container">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="share-url-input"
              aria-label="Share link"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`copy-button ${copied ? 'copied' : ''}`}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>

          <div className="share-info">
            <p><strong>What gets shared:</strong></p>
            <ul>
              <li>Plan name and description</li>
              <li>Country and year</li>
              <li>Selected vacation days</li>
              <li>Public holidays in the plan</li>
            </ul>
            <p className="share-note">
              Note: Share links encode plan data in the URL (not encrypted). Anyone with the link can
              see the dates. Recipients must confirm before importing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
