import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-2xl border px-4 py-3 font-semibold shadow-[0_14px_34px_-16px_rgba(2,6,23,0.72)] backdrop-blur-sm group-[.toaster]:border-border/80 group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground",
          title: "text-sm sm:text-[15px] font-extrabold tracking-tight",
          description: "mt-1 text-xs sm:text-sm leading-relaxed group-[.toast]:text-muted-foreground",
          actionButton:
            "rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold shadow-sm group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold border border-border/70 group-[.toast]:bg-muted/80 group-[.toast]:text-muted-foreground",
          closeButton:
            "rounded-full border border-border/70 bg-background/80 text-muted-foreground hover:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
