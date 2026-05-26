import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface NotificationProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function Notification({ toasts, onRemove }: NotificationProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-white';
          let borderColor = 'border-slate-100';
          let iconColor = 'text-slate-500';
          let Icon = Info;

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-50';
            borderColor = 'border-emerald-200';
            iconColor = 'text-emerald-500';
            Icon = CheckCircle;
          } else if (toast.type === 'error') {
            bgColor = 'bg-rose-50';
            borderColor = 'border-rose-200';
            iconColor = 'text-rose-500';
            Icon = AlertCircle;
          } else if (toast.type === 'warning') {
            bgColor = 'bg-amber-50';
            borderColor = 'border-amber-200';
            iconColor = 'text-amber-500';
            Icon = Info;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 shadow-lg ${bgColor} ${borderColor} text-slate-800 pointer-events-auto`}
              role="alert"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-sm font-medium pr-2">
                {toast.message}
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-0.5 cursor-pointer focus:outline-none transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
