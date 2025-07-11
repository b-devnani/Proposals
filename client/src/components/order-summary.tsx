import { Save, Eye, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/upgrade-data";
import { Upgrade } from "@shared/schema";

interface OrderSummaryProps {
  basePrice: string;
  baseCost: string;
  lotPremium: string;
  salesIncentive: string;
  salesIncentiveEnabled: boolean;
  designStudioAllowance: string;
  selectedUpgrades: Upgrade[];
  showCostColumns: boolean;
  onSaveDraft: () => void;
  onPreview: () => void;
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
  showCostColumns,
  onSaveDraft,
  onPreview,
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
  
  const grandTotal = parseFloat(basePrice) + parseFloat(lotPremium || "0") + (salesIncentiveEnabled ? parseFloat(salesIncentive || "0") : 0) + parseFloat(designStudioAllowance || "0") + upgradesTotal;
  const totalCost = parseFloat(baseCost || "0") + upgradesBuilderCost;
  const overallMargin = grandTotal > 0 ? ((grandTotal - totalCost) / grandTotal * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky bottom-0">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Proposal Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between items-center min-w-[300px]">
                <span>Base Price:</span>
                <span className="font-medium">{formatCurrency(basePrice)}</span>
              </div>
              {showCostColumns && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span>Base Cost:</span>
                    <span className="font-medium">{formatCurrency(baseCost || "0")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Lot Premium:</span>
                    <span className="font-medium">{formatCurrency(lotPremium || "0")}</span>
                  </div>
                  {salesIncentiveEnabled && (
                    <div className="flex justify-between items-center">
                      <span>Sales Incentive:</span>
                      <span className="font-medium text-red-600">{formatCurrency(salesIncentive)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span>Base Margin (incl. adjustments):</span>
                    <span className={`font-medium ${baseMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {baseMargin >= 0 ? '+' : ''}{baseMargin.toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span>Design Studio Allowance:</span>
                <span className="font-medium text-purple-600">{formatCurrency(designStudioAllowance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Selected Upgrades ({selectedUpgrades.length}):</span>
                <span className="font-medium">{formatCurrency(upgradesTotal)}</span>
              </div>
              {showCostColumns && selectedUpgrades.length > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span>Upgrades Builder Cost:</span>
                    <span className="font-medium">{formatCurrency(upgradesBuilderCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Upgrades Margin:</span>
                    <span className={`font-medium ${upgradesMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {upgradesMargin >= 0 ? '+' : ''}{upgradesMargin.toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
              <Separator className="my-1" />
              {showCostColumns && (
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>Overall Margin:</span>
                  <span className={`${overallMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overallMargin >= 0 ? '+' : ''}{overallMargin.toFixed(2)}%
                  </span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                <span>Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onSaveDraft}>
              <Save className="w-3 h-3 mr-1" />
              Save Draft
            </Button>
            <Button variant="secondary" size="sm" onClick={onPreview}>
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={onExportExcel}>
              <Download className="w-3 h-3 mr-1" />
              Export Excel
            </Button>
            <Button size="sm" onClick={onGenerateProposal}>
              <FileText className="w-3 h-3 mr-1" />
              Generate Proposal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
