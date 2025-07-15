import { Upgrade } from "@shared/schema";

export interface GroupedUpgrades {
  [category: string]: {
    [location: string]: {
      [parentSelection: string]: Upgrade[];
    };
  };
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

  return grouped;
}

export function sortUpgrades(upgrades: Upgrade[]): Upgrade[] {
  return upgrades.sort((a, b) => {
    // Primary sort by category
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
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
  return {
    value: `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`,
    isPositive: num >= 0,
  };
}
