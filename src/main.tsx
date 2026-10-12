import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { StyleProvider } from "@ant-design/cssinjs";
import { App as AntApp, ConfigProvider } from "antd";
import idID from "antd/locale/id_ID";
import "./index.css";
import App from "./App.tsx";
import { queryClient } from "./lib/queryClient";
import { setNotify } from "./lib/notify";
import { antTheme } from "./lib/theme";

function NotifyBridge() {
  setNotify(AntApp.useApp().message);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* layer: antd styles live in @layer antd so Tailwind utilities can override them */}
        <StyleProvider layer>
          <ConfigProvider theme={antTheme} locale={idID}>
            <AntApp>
              <NotifyBridge />
              <App />
            </AntApp>
          </ConfigProvider>
        </StyleProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
