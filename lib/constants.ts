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
    name: "Engineering",
    color: COLORS.green,
    caption: "checks equipment against hard site limits",
    icon: "Building2",
  },
  green: {
    key: "green",
    name: "Carbon",
    color: COLORS.amber,
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
    name: "Schedule risk",
    color: COLORS.blue,
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
  "Schedule risk": "Estimates delay exposure in days from the project schedule.",
  "Pydantic JSON": "A schema-validated JSON object — every field has a type and confidence score.",
};

export type Status = "PASS" | "FAIL" | "FLAG";

export const STATUS_COLOR: Record<Status, string> = {
  PASS: COLORS.green,
  FAIL: COLORS.red,
  FLAG: COLORS.amber,
};
