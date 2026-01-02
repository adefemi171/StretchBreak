import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { generateShareUrl, copyToClipboard } from '../../services/shareService';
import './ShareModal.css';
export const ShareModal = ({ plan, onClose }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = generateShareUrl(plan);
    const handleCopy = async () => {
        const success = await copyToClipboard(shareUrl);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    return (_jsx("div", { className: "share-modal-overlay", onClick: onClose, children: _jsxs("div", { className: "share-modal", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "share-modal-header", children: [_jsxs("h3", { children: ["Share Plan: ", plan.name] }), _jsx("button", { className: "close-button", onClick: onClose, children: "\u00D7" })] }), _jsxs("div", { className: "share-modal-content", children: [_jsx("p", { className: "share-description", children: "Copy the link below to share this holiday plan with others. Anyone with the link can view and import the plan." }), _jsxs("div", { className: "share-url-container", children: [_jsx("input", { type: "text", value: shareUrl, readOnly: true, className: "share-url-input", onClick: (e) => e.target.select() }), _jsx("button", { onClick: handleCopy, className: `copy-button ${copied ? 'copied' : ''}`, children: copied ? '✓ Copied!' : 'Copy Link' })] }), _jsxs("div", { className: "share-info", children: [_jsx("p", { children: _jsx("strong", { children: "What gets shared:" }) }), _jsxs("ul", { children: [_jsx("li", { children: "Plan name and description" }), _jsx("li", { children: "Country and year" }), _jsx("li", { children: "Selected vacation days" }), _jsx("li", { children: "Public holidays in the plan" })] }), _jsx("p", { className: "share-note", children: "Note: The shared plan will be imported as a new plan in the recipient's app." })] })] })] }) }));
};
