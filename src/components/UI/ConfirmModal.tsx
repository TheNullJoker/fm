import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-bg-primary w-full max-w-sm rounded-xl border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-text-primary">{title}</h3>
                <p className="text-text-muted">{message}</p>
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onCancel}>{cancelText}</Button>
                    <Button
                        variant="primary"
                        onClick={onConfirm}
                        className={cn(
                            variant === 'danger' && "bg-gradient-to-br from-red-600 to-red-800 hover:shadow-red-900/20"
                        )}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
