import { AlertCircle, Info } from "lucide-react";

export type AlertType = "error" | "info" | "warning";

export function StatusAlert({
  type,
  message,
  className = "",
}: Readonly<{
  type: AlertType;
  message: React.ReactNode;
  className?: string;
}>) {
  const styles = {
    error: "bg-[#FCEEED] text-[#D32F2F] border-transparent",
    info: "bg-[#F5F5F5] text-[#424242] border-transparent",
    warning: "bg-[#FFF8E1] text-[#F57F17] border-transparent",
  };

  const icons = {
    error: <AlertCircle className="mt-0.5 mr-2.5 h-4 w-4 flex-none" />,
    info: <Info className="mt-0.5 mr-2.5 h-4 w-4 flex-none" />,
    warning: <Info className="mt-0.5 mr-2.5 h-4 w-4 flex-none" />,
  };

  return (
    <div
      className={`flex w-full items-start rounded-lg p-3 font-normal text-sm leading-5 ${styles[type]} ${className}`}
    >
      {icons[type]}
      <div className="flex-1">{message}</div>
    </div>
  );
}
