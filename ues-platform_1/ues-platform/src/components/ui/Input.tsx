import { cn } from "@/lib/utils";
import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightAdornment?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, rightAdornment, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-mint-700 font-body">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn("ues-input", error && "border-pink-ues", className)}
            {...props}
          />
          {rightAdornment && (
            <div className="absolute inset-y-0 right-4 flex items-center justify-center">
              {rightAdornment}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-pink-ues mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-mint-700 font-body">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn("ues-input resize-y min-h-[100px]", error && "border-pink-ues", className)}
          {...props}
        />
        {error && <p className="text-xs text-pink-ues mt-0.5">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-mint-700 font-body">
            {label}
          </label>
        )}
        <select ref={ref} className={cn("ues-select", className)} {...props}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";

export { Input, Textarea, Select };
