
'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: CustomSelectOption[];
  placeholder?: string;
  onValueChange?: (value: string) => void; // Added for easier integration with RHF
}

const CustomSelect = React.forwardRef<HTMLSelectElement, CustomSelectProps>(
  ({ className, options, placeholder, value, onValueChange, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLSelectElement>(null);
    const handleRef = (node: HTMLSelectElement | null) => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      (internalRef as React.MutableRefObject<HTMLSelectElement | null>).current = node;
    };

     const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = event.target.value;
        if (onValueChange) {
          onValueChange(newValue);
        }
        if (onChange) {
          onChange(event); // Call original onChange if provided
        }
     };

    return (
      <div className="relative w-full">
        <select
          ref={handleRef}
          value={value}
          onChange={handleChange}
          className={cn(
            "flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
             // Add custom class for styling placeholder
            !value && "text-muted-foreground",
            className
          )}
          {...props}
        >
          {placeholder && <option value="" disabled hidden>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
      </div>
    );
  }
);
CustomSelect.displayName = "CustomSelect";

export { CustomSelect };
export type { CustomSelectOption };

    