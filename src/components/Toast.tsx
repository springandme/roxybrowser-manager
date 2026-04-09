import { useEffect } from "react";
import { CheckCircle, Info, X, XCircle } from "lucide-react";
import { useStore } from "../stores/useStore";

const iconMap = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
};

const alertClass = {
    success: "alert-success",
    error: "alert-error",
    info: "alert-info",
};

export default function Toast() {
    const { toasts, removeToast } = useStore();

    return (
        <div className="toast toast-top toast-end z-[9999] mt-2 mr-2">
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
            ))}
        </div>
    );
}

function ToastItem({
    toast,
    onDismiss,
}: {
    toast: { id: string; type: "success" | "error" | "info"; message: string; duration: number };
    onDismiss: (id: string) => void;
}) {
    const Icon = iconMap[toast.type];

    useEffect(() => {
        if (toast.duration > 0) {
            const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.id, toast.duration, onDismiss]);

    return (
        <div className={`alert ${alertClass[toast.type]} shadow-lg py-3 px-4 flex items-center gap-2 max-w-sm`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm flex-1">{toast.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => onDismiss(toast.id)}>
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}
