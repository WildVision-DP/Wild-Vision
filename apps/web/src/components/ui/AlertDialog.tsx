import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { Button } from './button';

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    variant?: 'error' | 'warning' | 'info' | 'success';
}

export default function AlertDialog({
    isOpen,
    onClose,
    title,
    message,
    variant = 'info'
}: AlertDialogProps) {
    if (!isOpen) return null;

    const icons = {
        error: <XCircle className="w-6 h-6 text-red-600" />,
        warning: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
        info: <Info className="w-6 h-6 text-blue-600" />,
        success: <CheckCircle className="w-6 h-6 text-green-600" />
    };

    const colors = {
        error: 'bg-red-50 border-red-200',
        warning: 'bg-yellow-50 border-yellow-200',
        info: 'bg-blue-50 border-blue-200',
        success: 'bg-green-50 border-green-200'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`flex items-start gap-4 p-6 border-b ${colors[variant]}`}>
                    {icons[variant]}
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="mt-2 text-sm text-gray-600">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 hover:bg-white/50 p-1 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50">
                    <Button onClick={onClose} className="min-w-20">
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
}
