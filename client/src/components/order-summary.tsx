import { Save, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatMargin } from "@/lib/upgrade-data";
import { Upgrade, SpecialRequest } from "@shared/schema";

interface OrderSummaryProps {
  basePrice: string;
  baseCost: string;
  lotPremium: string;
  salesIncentive: string;
  salesIncentiveEnabled: boolean;
  designStudioAllowance: string;
  selectedUpgrades: Upgrade[];
  specialRequests: SpecialRequest[];
  showCostColumns: boolean;
  isExistingProposal?: boolean;
  hasUnsavedChanges?: boolean;
  onSaveDraft: () => void;
  onSaveChanges?: () => void;
  onGenerateProposal: () => void;
  onExportExcel: () => void;
}

export function OrderSummary({
  basePrice,
  baseCost,
  lotPremium,
  salesIncentive,
  salesIncentiveEnabled,
  designStudioAllowance,
  selectedUpgrades,
  specialRequests,
  showCostColumns,
  isExistingProposal = false,
  hasUnsavedChanges = false,
  onSaveDraft,
  onSaveChanges,
  onGenerateProposal,
  onExportExcel,
}: OrderSummaryProps) {
  const upgradesTotal = selectedUpgrades.reduce(
    (total, upgrade) => total + parseFloat(upgrade.clientPrice),
    0
  );

  const upgradesBuilderCost = selectedUpgrades.reduce(
    (total, upgrade) => total + parseFloat(upgrade.builderCost),
    0
  );

  const adjustedBasePrice = parseFloat(basePrice) + parseFloat(lotPremium || "0") + (salesIncentiveEnabled ? parseFloat(salesIncentive || "0") : 0);
  const baseMargin = adjustedBasePrice > 0 ? ((adjustedBasePrice - parseFloat(baseCost || "0")) / adjustedBasePrice * 100) : 0;
  const upgradesMargin = upgradesTotal > 0 ? ((upgradesTotal - upgradesBuilderCost) / upgradesTotal * 100) : 0;
  
  // Subtotals
  const baseSubtotal = parseFloat(basePrice) + parseFloat(lotPremium || "0") + (salesIncentiveEnabled ? parseFloat(salesIncentive || "0") : 0);
  const specialRequestsTotal = specialRequests.reduce((sum, req) => sum + parseFloat(req.clientPrice), 0);
  const upgradesSubtotal = parseFloat(designStudioAllowance || "0") + upgradesTotal + specialRequestsTotal;
  
  const grandTotal = baseSubtotal + upgradesSubtotal;
  const specialRequestCostTotal = specialRequests.reduce((sum, req) => sum + parseFloat(req.builderCost), 0);
  const totalCost = parseFloat(baseCost || "0") + upgradesBuilderCost + specialRequestCostTotal;
  const overallMargin = grandTotal > 0 ? ((grandTotal - totalCost) / grandTotal * 100) : 0;
  
  // Calculate combined selections margin (standard + SRO)
  const totalSelectionsPrice = upgradesTotal + specialRequestsTotal;
  const totalSelectionsCost = upgradesBuilderCost + specialRequestCostTotal;
  const selectionsMargin = totalSelectionsPrice > 0 ? ((totalSelectionsPrice - totalSelectionsCost) / totalSelectionsPrice * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky bottom-0 mt-4">
      <div className="px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3">Proposal Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {/* Left Column - Base */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span>Base Price:</span>
                  <span className="font-medium">{formatCurrency(basePrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Lot Premium:</span>
                  <span className="font-medium">{formatCurrency(lotPremium || "0")}</span>
                </div>
                {salesIncentiveEnabled && (
                  <div className="flex justify-between items-center">
                    <span>Sales Adjustment:</span>
                    <span className="font-medium text-red-600">{formatCurrency(salesIncentive)}</span>
                  </div>
                )}
                <div className="border-t pt-1 mt-1">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Base Subtotal:</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(baseSubtotal)}</span>
                  </div>
                </div>
                {showCostColumns && (
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Base Cost:</span>
                    <span className="font-medium">{formatCurrency(baseCost || "0")}</span>
                  </div>
                )}
                {showCostColumns && (
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Margin:</span>
                    <span className={`font-medium ${formatMargin(baseMargin / 100).colorClass}`}>
                      {formatMargin(baseMargin / 100).value}
                    </span>
                  </div>
                )}
              </div>

              {/* Middle Column - Upgrades */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span>Design Studio:</span>
                  <span className="font-medium text-purple-600">{formatCurrency(designStudioAllowance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Selections ({selectedUpgrades.length}):</span>
                  <span className="font-medium">{formatCurrency(upgradesTotal)}</span>
                </div>
                {specialRequests.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Special Requests ({specialRequests.length}):</span>
                    <span className="font-medium text-orange-600">{formatCurrency(specialRequestsTotal)}</span>
                  </div>
                )}
                <div className="border-t pt-1 mt-1">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Selections Subtotal:</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(upgradesSubtotal)}</span>
                  </div>
                </div>
                {showCostColumns && (selectedUpgrades.length > 0 || specialRequests.length > 0) && (
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Selections Cost:</span>
                    <span className="font-medium">{formatCurrency(totalSelectionsCost)}</span>
                  </div>
                )}
                {showCostColumns && (selectedUpgrades.length > 0 || specialRequests.length > 0) && (
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Margin:</span>
                    <span className={`font-medium ${formatMargin(selectionsMargin / 100).colorClass}`}>
                      {formatMargin(selectionsMargin / 100).value}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column - Grand Total */}
              <div className="flex flex-col justify-center items-center">
                <div className="text-center">
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Grand Total</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(grandTotal)}</div>
                  {showCostColumns && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                      <div>
                        <span>Total Cost: </span>
                        <span className="font-medium">{formatCurrency(totalCost)}</span>
                      </div>
                      <div>
                        <span>Overall Margin: </span>
                        <span className={`font-medium ${formatMargin(overallMargin / 100).colorClass}`}>
                          {formatMargin(overallMargin / 100).value}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            

          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2 mt-4 lg:mt-0 lg:ml-6">
            {isExistingProposal ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSaveChanges} 
                disabled={!hasUnsavedChanges}
                className={`w-full sm:w-auto ${!hasUnsavedChanges ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Save className="w-3 h-3 mr-1" />
                Save Changes
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onSaveDraft} className="w-full sm:w-auto">
                <Save className="w-3 h-3 mr-1" />
                Save New Draft
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onExportExcel} className="w-full sm:w-auto">
              <Download className="w-3 h-3 mr-1" />
              Export Excel
            </Button>
            <Button size="sm" onClick={onGenerateProposal} className="w-full sm:w-auto">
              <FileText className="w-3 h-3 mr-1" />
              Generate Proposal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
