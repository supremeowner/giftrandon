import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  onCheckedChange?: (checked: boolean) => void;
};

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked,
      disabled,
      onCheckedChange,
      onChange,
      ...props
    },
    ref,
  ) => {
    const isControlled = typeof checked === "boolean";
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
    const resolvedChecked = isControlled ? checked : internalChecked;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextChecked = event.target.checked;
      if (!isControlled) {
        setInternalChecked(nextChecked);
      }
      onCheckedChange?.(nextChecked);
      onChange?.(event);
    };

    return (
      <label
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          className,
        )}
        data-state={resolvedChecked ? "checked" : "unchecked"}
        data-disabled={disabled ? "" : undefined}
        aria-disabled={disabled ? "true" : undefined}
      >
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={isControlled ? resolvedChecked : undefined}
          defaultChecked={!isControlled ? defaultChecked : undefined}
          disabled={disabled}
          onChange={handleChange}
          {...props}
        />
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          )}
          data-state={resolvedChecked ? "checked" : "unchecked"}
          aria-hidden="true"
        />
      </label>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
