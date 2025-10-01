import React, { useState, useCallback, useMemo, useRef } from "react";
import { ChevronDown, ChevronRight, MapPin, Package, Expand, Shrink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upgrade } from "@shared/schema";
import { GroupedUpgrades, formatCurrency, formatMargin } from "@/lib/upgrade-data";

interface UpgradeTableProps {
  groupedUpgrades: GroupedUpgrades;
  selectedUpgrades: Set<string>;
  showCostColumns: boolean;
  onUpgradeToggle: (upgradeId: string) => void;
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
  const getAllLocationKeys = useCallback(() => {
    const keys: string[] = [];
    Object.entries(groupedUpgrades).forEach(([category, locations]) => {
      Object.keys(locations).forEach(location => {
        keys.push(`${category}-${location}`);
      });
    });
    return keys;
  }, [groupedUpgrades]);

  const allLocationKeys = useMemo(() => getAllLocationKeys(), [getAllLocationKeys]);
  const categoryKeys = useMemo(() => Object.keys(groupedUpgrades), [groupedUpgrades]);

  // Keep track of whether we've initialized the expanded state for this data
  const previousDataHash = useRef<string>("");
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(
    new Set()
  );

  // Only update expanded state on initial load or when data structure significantly changes
  React.useEffect(() => {
    const currentDataHash = JSON.stringify({
      categories: categoryKeys,
      locations: allLocationKeys
    });
    
    // Only reset expanded state if this is truly new data
    if (previousDataHash.current !== currentDataHash) {
      setExpandedCategories(new Set());
      setExpandedLocations(new Set());
      previousDataHash.current = currentDataHash;
    }
  }, [categoryKeys, allLocationKeys]);

  const toggleCategory = (category: string) => {
    console.log('Toggle category:', category, 'currently expanded:', expandedCategories.has(category));
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleLocation = (key: string) => {
    console.log('Toggle location:', key, 'currently expanded:', expandedLocations.has(key));
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedLocations(newExpanded);
  };

  const expandAll = () => {
    console.log('Expanding all:', { categoryKeys, allLocationKeys });
    setExpandedCategories(new Set(categoryKeys));
    setExpandedLocations(new Set(allLocationKeys));
  };

  const collapseAll = () => {
    console.log('Collapsing all locations');
    // Keep categories expanded, only collapse locations
    setExpandedCategories(new Set(categoryKeys));
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

  const areAllExpanded = expandedCategories.size === categoryKeys.length && 
                       expandedLocations.size === allLocationKeys.length;
  
  // Debug logging
  console.log('Current state:', {
    expandedCategories: Array.from(expandedCategories),
    expandedCategoriesSize: expandedCategories.size,
    categoryKeys,
    categoryKeysLength: categoryKeys.length,
    expandedLocations: Array.from(expandedLocations),
    expandedLocationsSize: expandedLocations.size,
    allLocationKeys,
    allLocationKeysLength: allLocationKeys.length,
    areAllExpanded
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Available Selections</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Select options to add to your proposal</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={areAllExpanded ? collapseAll : expandAll}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            {areAllExpanded ? (
              <>
                <Shrink className="h-4 w-4" />
                <span className="hidden sm:inline">Collapse All</span>
                <span className="sm:hidden">Collapse</span>
              </>
            ) : (
              <>
                <Expand className="h-4 w-4" />
                <span className="hidden sm:inline">Expand All</span>
                <span className="sm:hidden">Expand</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                Select
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                Choice Title
              </th>
              {showCostColumns && (
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                  Builder Cost
                </th>
              )}
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                Client Price
              </th>
              {showCostColumns && (
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[80px]">
                  Margin
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(groupedUpgrades).map(([category, locations]) => (
              <React.Fragment key={category}>
                {/* Category Header */}
                <tr className="bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => toggleCategory(category)}>
                  <td colSpan={showCostColumns ? 5 : 3} className="px-3 sm:px-6 py-3">
                    <div className="flex items-center space-x-2">
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      )}
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{category}</span>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
                        <tr className="bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => toggleLocation(locationKey)}>
                          <td className="px-3 sm:px-6 py-3">
                            <Checkbox
                              checked={areAllParentSelectionSelected(parentSelections)}
                              onCheckedChange={() => onSelectAll(category, location)}
                            />
                          </td>
                          <td colSpan={showCostColumns ? 4 : 2} className="px-3 sm:px-6 py-3">
                            <div className="flex items-center space-x-2">
                              {expandedLocations.has(locationKey) ? (
                                <ChevronDown className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                              )}
                              <MapPin className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                              <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{location}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
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
                              <tr className="bg-gray-100/50 dark:bg-gray-800/50">
                                <td className="px-6 py-2">
                                  <Checkbox
                                    checked={areAllSelected(upgrades)}
                                    onCheckedChange={() => onSelectAll(category, location, parentSelection)}
                                  />
                                </td>
                                <td colSpan={showCostColumns ? 4 : 2} className="px-3 sm:px-6 py-3">
                                  <div className="flex items-center space-x-2 pl-2 sm:pl-4">
                                    <Package className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                                    <span className="font-medium text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{parentSelection}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      ({upgrades.length} items)
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {/* Upgrade Rows */}
                              {upgrades.map((upgrade) => {
                                const margin = formatMargin(upgrade.margin);
                                return (
                                  <tr key={upgrade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-3 sm:px-6 py-2 sm:py-3">
                                      <Checkbox
                                        checked={selectedUpgrades.has(upgrade.id)}
                                        onCheckedChange={() => onUpgradeToggle(upgrade.id)}
                                      />
                                    </td>
                                    <td className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-gray-100 pl-4 sm:pl-8">
                                      <div className="break-words">{upgrade.choiceTitle}</div>
                                    </td>
                                    {showCostColumns && (
                                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                        {formatCurrency(upgrade.builderCost)}
                                      </td>
                                    )}
                                    <td className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {formatCurrency(upgrade.clientPrice)}
                                    </td>
                                    {showCostColumns && (
                                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm">
                                        <Badge
                                          variant="outline"
                                          className={`${margin.colorClass} border-current text-xs`}
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
