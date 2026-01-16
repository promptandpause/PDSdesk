import * as React from "react";

import { cn } from "./utils";

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "pds-input pds-focus disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}

export { Input };