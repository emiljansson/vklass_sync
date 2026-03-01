import { Toaster as Sonner, toast as sonnerToast } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#141e14',
          border: '2px solid rgba(34, 197, 94, 0.5)',
          color: '#4ade80',
          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
        },
        classNames: {
          toast: "group toast",
          description: "text-green-500/70",
          actionButton: "bg-green-600 text-black font-bold",
          cancelButton: "bg-green-500/20 text-green-400",
        },
      }}
      {...props} />
  );
}

// Wrapper function to ensure toasts auto-dismiss on Safari/iOS
const createToastWithAutoDismiss = (type) => (message, options = {}) => {
  const duration = options.duration || 3000;
  const toastId = sonnerToast[type](message, { ...options, duration });
  
  // Manual dismiss as backup for Safari/iOS
  setTimeout(() => {
    sonnerToast.dismiss(toastId);
  }, duration + 100);
  
  return toastId;
};

const toast = {
  success: createToastWithAutoDismiss('success'),
  error: createToastWithAutoDismiss('error'),
  info: createToastWithAutoDismiss('info'),
  warning: createToastWithAutoDismiss('warning'),
  message: createToastWithAutoDismiss('message'),
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
  loading: sonnerToast.loading,
};

export { Toaster, toast }
