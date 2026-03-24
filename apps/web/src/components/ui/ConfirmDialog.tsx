import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'warning'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const icons = {
        danger: <XCircle className="w-6 h-6 text-red-600" />,
        warning: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
        info: <Info className="w-6 h-6 text-blue-600" />,
        success: <CheckCircle className="w-6 h-6 text-green-600" />
    };

    const colors = {
        danger: 'bg-red-50 border-red-200',
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
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="min-w-20"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`min-w-20 ${
                            variant === 'danger' 
                                ? 'bg-red-600 hover:bg-red-700' 
                                : variant === 'success'
                                ? 'bg-green-600 hover:bg-green-700'
                                : ''
                        }`}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
