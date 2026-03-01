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
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#141e14] group-[.toaster]:text-green-400 group-[.toaster]:border-2 group-[.toaster]:border-green-500/50 group-[.toaster]:shadow-lg group-[.toaster]:shadow-green-500/20",
          description: "group-[.toast]:text-green-500/70",
          actionButton:
            "group-[.toast]:bg-green-600 group-[.toast]:text-black group-[.toast]:font-bold",
          cancelButton:
            "group-[.toast]:bg-green-500/20 group-[.toast]:text-green-400",
          success: "group-[.toaster]:border-green-500/70",
          error: "group-[.toaster]:border-red-500/70 group-[.toaster]:text-red-400",
          info: "group-[.toaster]:border-cyan-500/70 group-[.toaster]:text-cyan-400",
          warning: "group-[.toaster]:border-amber-500/70 group-[.toaster]:text-amber-400",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
