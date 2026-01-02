import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((
        type: ToastType,
        title: string,
        message?: string,
        duration: number = 4000
    ) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        setToasts(prev => [...prev, { id, type, title, message, duration }]);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Toast Container Component
const ToastContainer = ({
    toasts,
    onRemove
}: {
    toasts: Toast[];
    onRemove: (id: string) => void;
}) => {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

// Individual Toast Component
const ToastItem = ({
    toast,
    onRemove
}: {
    toast: Toast;
    onRemove: (id: string) => void;
}) => {
    const icons = {
        success: <CheckCircle className="toast-icon" />,
        error: <XCircle className="toast-icon" />,
        warning: <AlertTriangle className="toast-icon" />,
        info: <Info className="toast-icon" />
    };

    return (
        <div className={`toast ${toast.type}`}>
            {icons[toast.type]}
            <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button
                className="btn btn-ghost btn-icon"
                onClick={() => onRemove(toast.id)}
                style={{ width: '28px', height: '28px' }}
            >
                <X size={16} />
            </button>
        </div>
    );
};
