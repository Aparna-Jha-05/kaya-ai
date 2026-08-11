// Design tokens + thresholds + labels, kept in one place so a judge can audit them.

export const COLORS = {
  // CSS variables keep SVG, charts, and inline styles in sync with the UI theme.
  bg: "rgb(var(--color-bg))",
  card: "rgb(var(--color-card))",
  surface: "rgb(var(--color-surface))",
  inset: "rgb(var(--color-inset))",
  line: "rgb(var(--color-line))",
  text: "rgb(var(--color-text))",
  muted: "rgb(var(--color-muted))",
  cyan: "rgb(var(--color-cyan))",
  emerald: "rgb(var(--color-emerald))",
  violet: "rgb(var(--color-violet))",
  amber: "rgb(var(--color-amber))",
  blue: "rgb(var(--color-blue))",
  rose: "rgb(var(--color-rose))",
} as const;

export const PATROL_META = {
  building: {
    key: "building",
    name: "Engineering & Spatial",
    color: COLORS.blue,
    caption: "Verifies equipment dimensions and power against site limits",
    icon: "Building2",
  },
  green: {
    key: "green",
    name: "Carbon & Sustainability",
    color: COLORS.emerald,
    caption: "Evaluates embodied carbon against project carbon budget",
    icon: "Leaf",
  },
  vice: {
    key: "vice",
    name: "Reliability & Safety",
    color: COLORS.violet,
    caption: "Assesses vendor delivery history, safety ratings, and dispute risk",
    icon: "ShieldAlert",
  },
  traffic: {
    key: "traffic",
    name: "Schedule & Delivery",
    color: COLORS.amber,
    caption: "Estimates schedule delay exposure against project deadlines",
    icon: "Truck",
  },
} as const;

// Plain-English definitions for jargon tooltips.
export const GLOSSARY: Record<string, string> = {
  Reliability:
    "Delivery and dispute history used to calculate a reliability risk score from 1 to 10.",
  "Vendor reliability":
    "Delivery and dispute history used to calculate a reliability risk score from 1 to 10.",
  "TCO²":
    "Total Cost of Ownership over 5 years, squared to price in carbon, reliability and schedule risk — not just sticker price.",
  EPD: "Environmental Product Declaration — certified carbon/water datasheet for a specific equipment model.",
  ROJ: "Required-On-Job date — deadline equipment must be on site to keep master schedule.",
  Engineering: "Checks power, cooling, water and floor load against hard site limits.",
  Carbon: "Compares embodied carbon with the project kgCO₂e budget.",
  Schedule: "Estimates delay exposure in days from project schedule.",
  "Schedule impact": "Estimates delay exposure in days from project schedule.",
  "Pydantic JSON": "A schema-validated JSON object — every field has a type and confidence score.",
};

export type Status = "PASS" | "FAIL" | "FLAG";

export const STATUS_COLOR: Record<Status, string> = {
  PASS: COLORS.cyan,
  FAIL: COLORS.rose,
  FLAG: COLORS.amber,
};

export const REVIEW_STATE = {
  RECOMMENDED: { label: "Compliant (Recommended)", color: COLORS.cyan },
  ACCEPTABLE: { label: "Flagged (Review Required)", color: COLORS.amber },
  REJECT: { label: "Non-Compliant (Reject)", color: COLORS.rose },
} as const;
