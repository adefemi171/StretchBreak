import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { downloadICal } from '../../services/calendarExport';
import { generatePlanOOOMessage } from '../../services/oooMessage';
import { useState } from 'react';
import './ExportPanel.css';
export const ExportPanel = ({ plan }) => {
    const [oooMessage, setOooMessage] = useState('');
    const [oooTone, setOooTone] = useState('professional');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    const handleGenerateOOO = async () => {
        setIsGenerating(true);
        setGenerationError(null);
        setOooMessage('');
        try {
            const message = await generatePlanOOOMessage(plan, {
                tone: oooTone,
                includeDates: true,
                includeBackDate: true,
            });
            setOooMessage(message);
        }
        catch (error) {
            setGenerationError(error instanceof Error ? error.message : 'Failed to generate message');
            console.error('Error generating OOO message:', error);
        }
        finally {
            setIsGenerating(false);
        }
    };
    const handleCopyOOO = async () => {
        if (oooMessage) {
            await navigator.clipboard.writeText(oooMessage);
            alert('Out-of-office message copied to clipboard!');
        }
    };
    const handleDownloadCalendar = () => {
        downloadICal(plan);
    };
    return (_jsxs("div", { className: "export-panel", children: [_jsx("h3", { children: "Export & Tools" }), _jsxs("div", { className: "export-section", children: [_jsx("h4", { children: "\uD83D\uDCC5 Download Calendar" }), _jsx("p", { children: "Export your vacation plan as an iCal file to import into your calendar application." }), _jsx("button", { onClick: handleDownloadCalendar, className: "export-button", children: "Download Calendar File (.ics)" })] }), _jsxs("div", { className: "export-section", children: [_jsx("h4", { children: "\uD83D\uDCE7 Out-of-Office Message" }), _jsx("p", { children: "Generate an out-of-office message for your vacation period." }), _jsxs("div", { className: "ooo-controls", children: [_jsxs("label", { children: ["Tone:", _jsxs("select", { value: oooTone, onChange: (e) => setOooTone(e.target.value), className: "tone-select", children: [_jsx("option", { value: "professional", children: "Professional" }), _jsx("option", { value: "casual", children: "Casual" }), _jsx("option", { value: "brief", children: "Brief" })] })] }), _jsx("button", { onClick: handleGenerateOOO, className: "generate-button", disabled: isGenerating, children: isGenerating ? 'Generating...' : 'Generate Message' })] }), generationError && (_jsxs("div", { className: "ooo-error", children: ["\u26A0\uFE0F ", generationError, _jsx("br", {}), _jsx("small", { children: "Falling back to template-based message." })] })), oooMessage && (_jsxs("div", { className: "ooo-message-container", children: [_jsx("textarea", { value: oooMessage, readOnly: true, className: "ooo-message", rows: 6 }), _jsx("button", { onClick: handleCopyOOO, className: "copy-button", children: "Copy to Clipboard" })] }))] })] }));
};
