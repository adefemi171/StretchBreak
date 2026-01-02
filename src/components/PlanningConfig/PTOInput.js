import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './PTOInput.css';
export const PTOInput = ({ value, onChange }) => {
    return (_jsxs("div", { className: "pto-input", children: [_jsx("label", { htmlFor: "pto-days", className: "pto-label", children: "Available PTO Days" }), _jsx("p", { className: "pto-description", children: "Enter how many paid time off days you have available. The app will optimize their use." }), _jsx("input", { id: "pto-days", type: "number", min: "0", max: "365", value: value || '', onChange: (e) => onChange(parseInt(e.target.value) || 0), className: "pto-input-field", placeholder: "Enter PTO days" })] }));
};
