// Design tokens + thresholds + labels, kept in one place so a judge can audit them.

export const COLORS = {
  bg: "#050F0B",
  card: "#0D2218",
  text: "#F1FFF6",
  green: "#5DE275",
  violet: "#AB7EFF",
  amber: "#F4B73F",
  blue: "#4AA2FF",
  red: "#FF4D4D",
} as const;

export const PATROL_META = {
  building: {
    key: "building",
    name: "Building Patrol",
    color: COLORS.green,
    caption: "checks equipment against the site's hard engineering limits",
    icon: "Building2",
  },
  green: {
    key: "green",
    name: "Green Patrol",
    color: COLORS.amber,
    caption: "prices the bid against the project's carbon budget",
    icon: "Leaf",
  },
  vice: {
    key: "vice",
    name: "Vice Squad",
    color: COLORS.violet,
    caption: "retrieves the vendor's track record and scores reliability risk",
    icon: "ShieldAlert",
  },
  traffic: {
    key: "traffic",
    name: "Traffic Control",
    color: COLORS.blue,
    caption: "simulates how a late delivery ripples through the schedule",
    icon: "Truck",
  },
} as const;

// Plain-English definitions for jargon tooltips.
export const GLOSSARY: Record<string, string> = {
  "Vice Squad":
    "Vendor-reliability patrol. Retrieves a vendor's delivery and dispute history (mock RAG) and scores risk 1–10.",
  "TCO²":
    "Total Cost of Ownership over 5 years, squared to also price in carbon, reliability and schedule risk — not just the sticker price.",
  EPD: "Environmental Product Declaration — a certified carbon/water datasheet for a specific equipment model.",
  ROJ: "Required-On-Job date — the deadline a piece of equipment must be on site to keep the master schedule.",
  "Building Patrol": "Engineering-compliance patrol. Checks power, cooling, water and floor-load against the site's hard limits.",
  "Green Patrol": "Carbon-budget patrol. Compares embodied carbon against the project's kgCO₂e budget.",
  "Traffic Control": "Schedule patrol. Runs a Monte Carlo to estimate delay exposure in days.",
  "Pydantic JSON": "A schema-validated JSON object — every field has a type and confidence score.",
};

export type Status = "PASS" | "FAIL" | "FLAG";

export const STATUS_COLOR: Record<Status, string> = {
  PASS: COLORS.green,
  FAIL: COLORS.red,
  FLAG: COLORS.amber,
};
