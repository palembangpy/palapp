import type { MessageInstance } from "antd/es/message/interface";

// Filled by <NotifyBridge/> (inside antd <App>) so non-component code can toast with theme context.
let instance: MessageInstance | null = null;

export const setNotify = (m: MessageInstance) => {
  instance = m;
};

export const notify = {
  success: (t: string) => instance?.success(t),
  error: (t: string) => instance?.error(t),
  info: (t: string) => instance?.info(t),
};
