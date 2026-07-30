import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "@workspace/ui/globals.css"
import { App } from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { ToastProvider } from "@/components/toast/toast-provider"
import { QueryProvider } from "@/providers/query-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <ToastProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>
)
