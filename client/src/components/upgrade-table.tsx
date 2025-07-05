import React, { useState } from "react";
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upgrade } from "@shared/schema";
import { GroupedUpgrades, formatCurrency, formatMargin } from "@/lib/upgrade-data";

interface UpgradeTableProps {
  groupedUpgrades: GroupedUpgrades;
  selectedUpgrades: Set<number>;
  showCostColumns: boolean;
  onUpgradeToggle: (upgradeId: number) => void;
  onSelectAll: (category: string, location: string) => void;
}

export function UpgradeTable({
  groupedUpgrades,
  selectedUpgrades,
  showCostColumns,
  onUpgradeToggle,
  onSelectAll,
}: UpgradeTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(groupedUpgrades))
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryUpgradeCount = (category: string): number => {
    return Object.values(groupedUpgrades[category] || {}).reduce(
      (total, upgrades) => total + upgrades.length,
      0
    );
  };

  const areAllSelected = (upgrades: Upgrade[]): boolean => {
    return upgrades.every(upgrade => selectedUpgrades.has(upgrade.id));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Available Upgrades</h2>
        <p className="text-sm text-gray-600">Select upgrades to add to your purchase order</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                Select
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Choice Title
              </th>
              {showCostColumns && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Builder Cost
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client Price
              </th>
              {showCostColumns && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margin
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(groupedUpgrades).map(([category, locations]) => (
              <React.Fragment key={category}>
                {/* Category Header */}
                <tr className="bg-gray-100 cursor-pointer hover:bg-gray-200" onClick={() => toggleCategory(category)}>
                  <td colSpan={showCostColumns ? 5 : 3} className="px-6 py-3">
                    <div className="flex items-center space-x-2">
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-semibold text-gray-900">{category}</span>
                      <span className="text-sm text-gray-500">
                        ({getCategoryUpgradeCount(category)} items)
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Category Content */}
                {expandedCategories.has(category) &&
                  Object.entries(locations).map(([location, upgrades]) => (
                    <React.Fragment key={`${category}-${location}`}>
                      {/* Location Header */}
                      <tr className="bg-gray-50">
                        <td className="px-6 py-2">
                          <Checkbox
                            checked={areAllSelected(upgrades)}
                            onCheckedChange={() => onSelectAll(category, location)}
                          />
                        </td>
                        <td colSpan={showCostColumns ? 4 : 2} className="px-6 py-2">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="font-medium text-gray-700 text-sm">{location}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Upgrade Rows */}
                      {upgrades.map((upgrade) => {
                        const margin = formatMargin(upgrade.margin);
                        return (
                          <tr key={upgrade.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">
                              <Checkbox
                                checked={selectedUpgrades.has(upgrade.id)}
                                onCheckedChange={() => onUpgradeToggle(upgrade.id)}
                              />
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-900">
                              {upgrade.choiceTitle}
                            </td>
                            {showCostColumns && (
                              <td className="px-6 py-3 text-sm text-gray-700">
                                {formatCurrency(upgrade.builderCost)}
                              </td>
                            )}
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">
                              {formatCurrency(upgrade.clientPrice)}
                            </td>
                            {showCostColumns && (
                              <td className="px-6 py-3 text-sm">
                                <Badge
                                  variant={margin.isPositive ? "default" : "destructive"}
                                  className={
                                    margin.isPositive
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : "bg-red-100 text-red-800 hover:bg-red-100"
                                  }
                                >
                                  {margin.value}
                                </Badge>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
