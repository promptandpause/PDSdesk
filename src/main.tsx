import { createRoot } from "react-dom/client";
import "./app/styles/base.css";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { ToastProvider } from "./app/components/Toast";
import { AppRoot } from "./app/AppRoot";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ToastProvider>
      <AppRoot />
    </ToastProvider>
  </AuthProvider>,
);