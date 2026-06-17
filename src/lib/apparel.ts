// src/lib/apparel.ts

import type { ApparelType } from "@/types/api";

/**
 * The marketplace API doesn't include a discrete apparel category on every
 * product. We derive one locally so the 3D procedural mesh + 2D silhouette
 * can pick the right shape. Defaults to "tshirt".
 */
export function inferApparelType(input: string | undefined | null): ApparelType {
  const t = (input ?? "").toLowerCase();
  if (/(hoodie|hood\b)/.test(t)) return "hoodie";
  if (/(cap|hat|trucker)/.test(t)) return "cap";
  if (/(bag|tote|backpack|sack)/.test(t)) return "bag";
  if (/(long sleeve|longsleeve|long-sleeve|sweater|sweatshirt|crew)/.test(t)) return "longsleeve";
  return "tshirt";
}
