import React, { useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Package, Expand, Shrink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upgrade } from "@shared/schema";
import { GroupedUpgrades, formatCurrency, formatMargin } from "@/lib/upgrade-data";

interface UpgradeTableProps {
  groupedUpgrades: GroupedUpgrades;
  selectedUpgrades: Set<number>;
  showCostColumns: boolean;
  onUpgradeToggle: (upgradeId: number) => void;
  onSelectAll: (category: string, location: string, parentSelection?: string) => void;
  onExpandCollapseAll?: (isExpanded: boolean) => void;
}

export function UpgradeTable({
  groupedUpgrades,
  selectedUpgrades,
  showCostColumns,
  onUpgradeToggle,
  onSelectAll,
}: UpgradeTableProps) {
  // Generate all possible location keys for default expansion
  const getAllLocationKeys = () => {
    const keys: string[] = [];
    Object.entries(groupedUpgrades).forEach(([category, locations]) => {
      Object.keys(locations).forEach(location => {
        keys.push(`${category}-${location}`);
      });
    });
    return keys;
  };

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(groupedUpgrades))
  );
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(
    new Set(getAllLocationKeys())
  );

  // Update expanded locations when data changes
  React.useEffect(() => {
    setExpandedLocations(new Set(getAllLocationKeys()));
  }, [groupedUpgrades]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleLocation = (key: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedLocations(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(groupedUpgrades)));
    setExpandedLocations(new Set(getAllLocationKeys()));
  };

  const collapseAll = () => {
    // Keep categories expanded, only collapse locations
    setExpandedCategories(new Set(Object.keys(groupedUpgrades)));
    setExpandedLocations(new Set());
  };

  const getCategoryUpgradeCount = (category: string): number => {
    return Object.values(groupedUpgrades[category] || {}).reduce(
      (total, locations) => total + Object.values(locations).reduce(
        (subTotal, upgrades) => subTotal + upgrades.length,
        0
      ),
      0
    );
  };

  const getLocationUpgradeCount = (locations: { [parentSelection: string]: Upgrade[] }): number => {
    return Object.values(locations).reduce(
      (total, upgrades) => total + upgrades.length,
      0
    );
  };

  const areAllSelected = (upgrades: Upgrade[]): boolean => {
    return upgrades.every(upgrade => selectedUpgrades.has(upgrade.id));
  };

  const areAllParentSelectionSelected = (parentSelections: { [parentSelection: string]: Upgrade[] }): boolean => {
    return Object.values(parentSelections).every(upgrades => areAllSelected(upgrades));
  };

  const areAllExpanded = expandedCategories.size === Object.keys(groupedUpgrades).length && 
                       expandedLocations.size === getAllLocationKeys().length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Available Upgrades</h2>
            <p className="text-sm text-gray-600">Select upgrades to add to your proposal</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={areAllExpanded ? collapseAll : expandAll}
            className="flex items-center gap-2"
          >
            {areAllExpanded ? (
              <>
                <Shrink className="h-4 w-4" />
                Collapse All
              </>
            ) : (
              <>
                <Expand className="h-4 w-4" />
                Expand All
              </>
            )}
          </Button>
        </div>
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
                  Object.entries(locations).map(([location, parentSelections]) => {
                    const locationKey = `${category}-${location}`;
                    return (
                      <React.Fragment key={locationKey}>
                        {/* Location Header */}
                        <tr className="bg-gray-50 cursor-pointer hover:bg-gray-100" onClick={() => toggleLocation(locationKey)}>
                          <td className="px-6 py-2">
                            <Checkbox
                              checked={areAllParentSelectionSelected(parentSelections)}
                              onCheckedChange={() => onSelectAll(category, location)}
                            />
                          </td>
                          <td colSpan={showCostColumns ? 4 : 2} className="px-6 py-2">
                            <div className="flex items-center space-x-2">
                              {expandedLocations.has(locationKey) ? (
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                              )}
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="font-medium text-gray-700 text-sm">{location}</span>
                              <span className="text-xs text-gray-500">
                                ({getLocationUpgradeCount(parentSelections)} items)
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Location Content */}
                        {expandedLocations.has(locationKey) &&
                          Object.entries(parentSelections).map(([parentSelection, upgrades]) => (
                            <React.Fragment key={`${locationKey}-${parentSelection}`}>
                              {/* Parent Selection Header */}
                              <tr className="bg-gray-100/50">
                                <td className="px-6 py-2">
                                  <Checkbox
                                    checked={areAllSelected(upgrades)}
                                    onCheckedChange={() => onSelectAll(category, location, parentSelection)}
                                  />
                                </td>
                                <td colSpan={showCostColumns ? 4 : 2} className="px-6 py-2">
                                  <div className="flex items-center space-x-2 pl-4">
                                    <Package className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium text-gray-600 text-sm">{parentSelection}</span>
                                    <span className="text-xs text-gray-500">
                                      ({upgrades.length} items)
                                    </span>
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
                                    <td className="px-6 py-3 text-sm text-gray-900 pl-8">
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
                                          variant="outline"
                                          className={`${margin.colorClass} border-current`}
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
                    );
                  })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
