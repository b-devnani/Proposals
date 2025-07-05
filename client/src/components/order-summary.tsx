import { Save, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/upgrade-data";
import { Upgrade } from "@shared/schema";

interface OrderSummaryProps {
  basePrice: string;
  baseCost: string;
  lotPremium: string;
  selectedUpgrades: Upgrade[];
  showCostColumns: boolean;
  onSaveDraft: () => void;
  onPreview: () => void;
  onGeneratePO: () => void;
}

export function OrderSummary({
  basePrice,
  baseCost,
  lotPremium,
  selectedUpgrades,
  showCostColumns,
  onSaveDraft,
  onPreview,
  onGeneratePO,
}: OrderSummaryProps) {
  const upgradesTotal = selectedUpgrades.reduce(
    (total, upgrade) => total + parseFloat(upgrade.clientPrice),
    0
  );

  const upgradesBuilderCost = selectedUpgrades.reduce(
    (total, upgrade) => total + parseFloat(upgrade.builderCost),
    0
  );

  const baseMargin = parseFloat(basePrice) > 0 ? ((parseFloat(basePrice) - parseFloat(baseCost || "0")) / parseFloat(basePrice) * 100) : 0;
  const upgradesMargin = upgradesTotal > 0 ? ((upgradesTotal - upgradesBuilderCost) / upgradesTotal * 100) : 0;
  
  const grandTotal = parseFloat(basePrice) + parseFloat(lotPremium || "0") + upgradesTotal;
  const totalCost = parseFloat(baseCost || "0") + upgradesBuilderCost;
  const overallMargin = grandTotal > 0 ? ((grandTotal - totalCost) / grandTotal * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky bottom-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="text-sm text-gray-600 space-y-2">
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
                  <div className="flex justify-between items-center text-sm">
                    <span>Base Margin:</span>
                    <span className={`font-medium ${baseMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {baseMargin >= 0 ? '+' : ''}{baseMargin.toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span>Lot Premium:</span>
                <span className="font-medium">{formatCurrency(lotPremium || "0")}</span>
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
              <Separator className="my-2" />
              {showCostColumns && (
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>Overall Margin:</span>
                  <span className={`${overallMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overallMargin >= 0 ? '+' : ''}{overallMargin.toFixed(2)}%
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                <span>Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onSaveDraft}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button variant="secondary" onClick={onPreview}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button onClick={onGeneratePO}>
              <FileText className="w-4 h-4 mr-2" />
              Generate PO
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
