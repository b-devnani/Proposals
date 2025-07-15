import { Upgrade } from "@shared/schema";

export interface GroupedUpgrades {
  [category: string]: {
    [location: string]: {
      [parentSelection: string]: Upgrade[];
    };
  };
}

// Custom category sorting order
const CATEGORY_ORDER = [
  "Structural Options",
  "Flooring",
  "Cabinetry Options",
  "Countertops",
  "Plumbing Trim",
  "Plumbing Options",
  "HVAC Options",
  "Electrical",
  "Light Fixtures",
  "Smart Home",
  "Fireplace",
  "Millwork",
  "Interior Trim",
  "Appliances",
  "Paint",
  "Roofing",
  "Mirrors, Medicine Cabinets & Accessories"
];

function getCategoryOrder(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? 999 : index; // Unknown categories go to end
}

export function groupUpgradesByCategory(upgrades: Upgrade[]): GroupedUpgrades {
  const grouped = upgrades.reduce((acc, upgrade) => {
    if (!acc[upgrade.category]) {
      acc[upgrade.category] = {};
    }
    if (!acc[upgrade.category][upgrade.location]) {
      acc[upgrade.category][upgrade.location] = {};
    }
    if (!acc[upgrade.category][upgrade.location][upgrade.parentSelection]) {
      acc[upgrade.category][upgrade.location][upgrade.parentSelection] = [];
    }
    acc[upgrade.category][upgrade.location][upgrade.parentSelection].push(upgrade);
    return acc;
  }, {} as GroupedUpgrades);

  // Sort upgrades within each parent selection by client price (ascending)
  Object.keys(grouped).forEach(category => {
    Object.keys(grouped[category]).forEach(location => {
      Object.keys(grouped[category][location]).forEach(parentSelection => {
        grouped[category][location][parentSelection].sort((a, b) => {
          const priceA = parseInt(a.clientPrice) || 0;
          const priceB = parseInt(b.clientPrice) || 0;
          if (priceA !== priceB) {
            return priceA - priceB;
          }
          return a.choiceTitle.localeCompare(b.choiceTitle);
        });
      });
    });
  });

  // Create a new object with categories sorted by custom order
  const sortedGrouped: GroupedUpgrades = {};
  const categoryKeys = Object.keys(grouped).sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b));
  
  categoryKeys.forEach(category => {
    sortedGrouped[category] = grouped[category];
  });

  return sortedGrouped;
}

export function sortUpgrades(upgrades: Upgrade[]): Upgrade[] {
  return upgrades.sort((a, b) => {
    // Primary sort by category using custom order
    if (a.category !== b.category) {
      return getCategoryOrder(a.category) - getCategoryOrder(b.category);
    }
    // Secondary sort by location
    if (a.location !== b.location) {
      return a.location.localeCompare(b.location);
    }
    // Tertiary sort by parent selection
    if (a.parentSelection !== b.parentSelection) {
      return a.parentSelection.localeCompare(b.parentSelection);
    }
    // Quaternary sort by client price (ascending)
    const priceA = parseInt(a.clientPrice) || 0;
    const priceB = parseInt(b.clientPrice) || 0;
    if (priceA !== priceB) {
      return priceA - priceB;
    }
    // Final sort by choice title
    return a.choiceTitle.localeCompare(b.choiceTitle);
  });
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseInt(amount) : Math.floor(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatMargin(margin: string | number): { value: string; isPositive: boolean } {
  const num = typeof margin === "string" ? parseFloat(margin) : margin;
  const percentage = num * 100;
  return {
    value: `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`,
    isPositive: percentage >= 0,
  };
}
