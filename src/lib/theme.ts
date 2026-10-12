import type { ThemeConfig } from "antd";

const font = "'Plus Jakarta Sans Variable', -apple-system, BlinkMacSystemFont, sans-serif";

export const antTheme: ThemeConfig = {
  token: {
    colorPrimary: "#101828",
    colorInfo: "#101828",
    colorSuccess: "#079455",
    colorError: "#D92D20",
    colorWarning: "#DC6803",
    colorText: "#101828",
    colorTextSecondary: "#475467",
    colorBorder: "#E4E7EC",
    colorBgLayout: "#F6F6F5",
    borderRadius: 12,
    borderRadiusLG: 20,
    controlHeight: 40,
    fontFamily: font,
    fontSize: 14,
  },
  components: {
    Button: { primaryShadow: "none", defaultShadow: "none", fontWeight: 600 },
    Table: { headerBg: "transparent", headerColor: "#101828", rowHoverBg: "#F6F6F5", headerSplitColor: "transparent", borderColor: "rgba(16,24,40,0.06)" },
    Segmented: { itemSelectedBg: "#101828", itemSelectedColor: "#FFFFFF", trackBg: "#F6F6F5" },
    Modal: { borderRadiusLG: 24 },
    Drawer: { colorBgElevated: "#F6F6F5" },
    Input: { activeShadow: "0 0 0 2px rgba(16,24,40,0.12)" },
    Select: { optionSelectedBg: "#D6E7E4" },
    Tag: { borderRadiusSM: 999 },
  },
};
