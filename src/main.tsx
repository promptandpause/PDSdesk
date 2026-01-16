import { createRoot } from "react-dom/client";
import "./app/styles/base.css";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { AppRoot } from "./app/AppRoot";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <AppRoot />
  </AuthProvider>,
);