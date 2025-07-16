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

// Custom location sorting order
const LOCATION_ORDER = [
  "01 - Elevations",
  "02 - Backyard",
  "Main Living Area",
  "Family Room",
  "Kitchen",
  "Owner's Bath",
  "Bath 2",
  "Owner's Suite",
  "Bedroom 2",
  "Dining Room",
  "Bedroom 3",
  "Laundry Room",
  "Mudroom",
  "Foyer",
  "Whole House",
  "Unassigned",
  "Garage",
  "Basement"
];

function getCategoryOrder(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? 999 : index; // Unknown categories go to end
}

function getLocationOrder(location: string): number {
  const index = LOCATION_ORDER.indexOf(location);
  return index === -1 ? 999 : index; // Unknown locations go to end
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
    sortedGrouped[category] = {};
    const locationKeys = Object.keys(grouped[category]).sort((a, b) => getLocationOrder(a) - getLocationOrder(b));
    
    locationKeys.forEach(location => {
      sortedGrouped[category][location] = grouped[category][location];
    });
  });

  return sortedGrouped;
}

export function sortUpgrades(upgrades: Upgrade[]): Upgrade[] {
  return upgrades.sort((a, b) => {
    // Primary sort by category using custom order
    if (a.category !== b.category) {
      return getCategoryOrder(a.category) - getCategoryOrder(b.category);
    }
    // Secondary sort by location using custom order
    if (a.location !== b.location) {
      return getLocationOrder(a.location) - getLocationOrder(b.location);
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

export function formatMargin(margin: string | number): { 
  value: string; 
  isPositive: boolean; 
  colorClass: string; 
} {
  const num = typeof margin === "string" ? parseFloat(margin) : margin;
  const percentage = num * 100;
  
  // Determine color class based on margin ranges
  let colorClass = "";
  if (percentage < 0) {
    colorClass = "text-red-600"; // Negative values - red
  } else if (percentage >= 0 && percentage < 30) {
    colorClass = "text-yellow-600"; // 0-30% - yellow
  } else if (percentage >= 30 && percentage < 55) {
    colorClass = "text-green-600"; // 30-55% - green
  } else {
    colorClass = "text-purple-600"; // 55% and over - purple
  }
  
  return {
    value: `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`,
    isPositive: percentage >= 0,
    colorClass: colorClass,
  };
}
