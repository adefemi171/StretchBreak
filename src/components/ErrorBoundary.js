import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { style: { padding: '2rem', textAlign: 'center' }, children: [_jsx("h2", { children: "Something went wrong" }), _jsx("p", { style: { color: '#dc3545' }, children: this.state.error?.message || 'An unexpected error occurred' }), _jsx("button", { onClick: () => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }, style: {
                            padding: '10px 20px',
                            marginTop: '1rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }, children: "Reload Page" }), _jsxs("details", { style: { marginTop: '2rem', textAlign: 'left' }, children: [_jsx("summary", { children: "Error Details" }), _jsx("pre", { style: { background: '#f5f5f5', padding: '1rem', overflow: 'auto' }, children: this.state.error?.stack })] })] }));
        }
        return this.props.children;
    }
}
