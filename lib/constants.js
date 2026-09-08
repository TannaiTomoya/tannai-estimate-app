export const UNIT_PRICE_OPTIONS = [
  25000, 28000, 30000, 35000, 36000, 40000, 45000, 50000, 56000, 60000, 64000,
  68000, 72000,
];

export const MARKUP_RATE_OPTIONS = [1.0, 1.2, 1.3, 1.5];

export const TAX_RATE = 0.1;

export const LABOR_LINES = {
  minimum: { price: 30000, label: "手間代最低ライン" },
  maintain: { price: 50000, label: "会社維持ライン" },
  highLoadMin: { price: 60000, label: "高負荷・消耗品・技術料込みライン" },
  highLoadMax: { price: 72000, label: "高負荷・消耗品・技術料込みライン上限" },
};

export const WORKLOAD_OPTIONS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

export const STATUS_OPTIONS = [
  { value: "draft", label: "下書き" },
  { value: "presented", label: "提示済み" },
  { value: "won", label: "受注" },
  { value: "lost", label: "失注" },
  { value: "done", label: "完了" },
];

export const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map((item) => [item.value, item.label]),
);

export const WORKLOAD_LABELS = Object.fromEntries(
  WORKLOAD_OPTIONS.map((item) => [item.value, item.label]),
);
