"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--pds-surface)",
          "--normal-text": "var(--pds-text)",
          "--normal-border": "var(--pds-border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };