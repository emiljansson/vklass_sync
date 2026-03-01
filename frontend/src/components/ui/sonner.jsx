import { Toaster as Sonner, toast } from "sonner"

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

export { Toaster, toast }
