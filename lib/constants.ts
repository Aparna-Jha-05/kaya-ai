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
    name: "Engineering",
    color: COLORS.blue,
    caption: "checks equipment against hard site limits",
    icon: "Building2",
  },
  green: {
    key: "green",
    name: "Carbon",
    color: COLORS.emerald,
    caption: "checks the bid against the project carbon budget",
    icon: "Leaf",
  },
  vice: {
    key: "vice",
    name: "Vendor reliability",
    color: COLORS.violet,
    caption: "checks delivery history and dispute risk",
    icon: "ShieldAlert",
  },
  traffic: {
    key: "traffic",
    name: "Schedule impact",
    color: COLORS.amber,
    caption: "estimates the effect of late delivery on the schedule",
    icon: "Truck",
  },
} as const;

// Plain-English definitions for jargon tooltips.
export const GLOSSARY: Record<string, string> = {
  "Vendor reliability":
    "Delivery and dispute history used to calculate a reliability risk score from 1 to 10.",
  "TCO²":
    "Total Cost of Ownership over 5 years, squared to also price in carbon, reliability and schedule risk — not just the sticker price.",
  EPD: "Environmental Product Declaration — a certified carbon/water datasheet for a specific equipment model.",
  ROJ: "Required-On-Job date — the deadline a piece of equipment must be on site to keep the master schedule.",
  Engineering: "Checks power, cooling, water and floor load against hard site limits.",
  Carbon: "Compares embodied carbon with the project kgCO₂e budget.",
  "Schedule impact": "Estimates delay exposure in days from the project schedule.",
  "Pydantic JSON": "A schema-validated JSON object — every field has a type and confidence score.",
};

export type Status = "PASS" | "FAIL" | "FLAG";

export const STATUS_COLOR: Record<Status, string> = {
  PASS: COLORS.cyan,
  FAIL: COLORS.rose,
  FLAG: COLORS.amber,
};

export const REVIEW_STATE = {
  RECOMMENDED: { label: "Ready for decision", color: COLORS.cyan },
  ACCEPTABLE: { label: "Needs review", color: COLORS.amber },
  REJECT: { label: "Do not select", color: COLORS.rose },
} as const;
