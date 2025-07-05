import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { UpgradeTable } from "@/components/upgrade-table";
import { OrderSummary } from "@/components/order-summary";
import { HomeTemplate, Upgrade } from "@shared/schema";
import { groupUpgradesByCategory, sortUpgrades } from "@/lib/upgrade-data";
import { apiRequest } from "@/lib/queryClient";

export default function PurchaseOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [activeTemplate, setActiveTemplate] = useState<string>("1"); // Ravello ID
  const [showCostColumns, setShowCostColumns] = useState(true);
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState({
    todaysDate: new Date().toISOString().split('T')[0],
    buyerLastName: "",
    community: "",
    lotNumber: "",
    lotAddress: "",
    lotPremium: "0",
  });

  // Queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery<HomeTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: upgrades = [], isLoading: upgradesLoading } = useQuery<Upgrade[]>({
    queryKey: ["/api/upgrades"],
  });

  // Mutations
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<HomeTemplate> }) => {
      return await apiRequest("PATCH", `/api/templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template Updated",
        description: "Base price has been updated successfully.",
      });
    },
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("POST", "/api/purchase-orders", orderData);
    },
    onSuccess: () => {
      toast({
        title: "Purchase Order Created",
        description: "Your purchase order has been generated successfully.",
      });
    },
  });

  // Get current template
  const currentTemplate = templates.find(t => t.id.toString() === activeTemplate);
  
  // Process upgrades
  const sortedUpgrades = sortUpgrades(upgrades);
  const groupedUpgrades = groupUpgradesByCategory(sortedUpgrades);
  const selectedUpgradeItems = upgrades.filter(upgrade => selectedUpgrades.has(upgrade.id));

  // Handlers
  const handleTemplateChange = (templateId: string) => {
    setActiveTemplate(templateId);
    setSelectedUpgrades(new Set()); // Reset selections when switching templates
  };

  const handleBasePriceUpdate = (price: string) => {
    if (currentTemplate) {
      updateTemplateMutation.mutate({
        id: currentTemplate.id,
        data: { basePrice: price }
      });
    }
  };

  const handleBaseCostUpdate = (cost: string) => {
    if (currentTemplate) {
      updateTemplateMutation.mutate({
        id: currentTemplate.id,
        data: { baseCost: cost }
      });
    }
  };

  const handleUpgradeToggle = (upgradeId: number) => {
    const newSelected = new Set(selectedUpgrades);
    if (newSelected.has(upgradeId)) {
      newSelected.delete(upgradeId);
    } else {
      newSelected.add(upgradeId);
    }
    setSelectedUpgrades(newSelected);
  };

  const handleSelectAll = (category: string, location: string) => {
    const locationUpgrades = groupedUpgrades[category]?.[location] || [];
    const allSelected = locationUpgrades.every(upgrade => selectedUpgrades.has(upgrade.id));
    
    const newSelected = new Set(selectedUpgrades);
    locationUpgrades.forEach(upgrade => {
      if (allSelected) {
        newSelected.delete(upgrade.id);
      } else {
        newSelected.add(upgrade.id);
      }
    });
    setSelectedUpgrades(newSelected);
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your purchase order draft has been saved.",
    });
  };

  const handlePreview = () => {
    toast({
      title: "Preview",
      description: "Opening purchase order preview...",
    });
  };

  const handleGeneratePO = () => {
    if (!currentTemplate) return;

    const orderData = {
      ...formData,
      housePlan: currentTemplate.name,
      basePrice: currentTemplate.basePrice,
      lotPremium: formData.lotPremium || "0",
      selectedUpgrades: Array.from(selectedUpgrades).map(String),
      totalPrice: (parseFloat(currentTemplate.basePrice) + 
        parseFloat(formData.lotPremium || "0") +
        selectedUpgradeItems.reduce((total, upgrade) => total + parseFloat(upgrade.clientPrice), 0)).toString(),
    };

    createPurchaseOrderMutation.mutate(orderData);
  };

  if (templatesLoading || upgradesLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Purchase Order Generator</h1>
              <p className="text-sm text-gray-600">Create and manage custom home purchase orders</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Label htmlFor="cost-toggle" className="text-sm text-gray-700 font-medium">
                Show Builder Cost & Margin
              </Label>
              <Switch
                id="cost-toggle"
                checked={showCostColumns}
                onCheckedChange={setShowCostColumns}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Template Tabs */}
        <Card className="mb-6">
          <Tabs value={activeTemplate} onValueChange={handleTemplateChange}>
            <TabsList className="grid w-full grid-cols-3">
              {templates.map((template) => (
                <TabsTrigger key={template.id} value={template.id.toString()}>
                  {template.name}
                  <span className="ml-2 text-xs text-gray-400">
                    ${parseFloat(template.basePrice).toLocaleString()}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {templates.map((template) => (
              <TabsContent key={template.id} value={template.id.toString()}>
                <CardContent className="p-6">
                  {/* Form Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div>
                      <Label htmlFor="todays-date">Today's Date</Label>
                      <Input
                        id="todays-date"
                        type="date"
                        value={formData.todaysDate}
                        onChange={(e) => setFormData({ ...formData, todaysDate: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="buyer-name">Buyer's Last Name</Label>
                      <Input
                        id="buyer-name"
                        placeholder="Enter last name"
                        value={formData.buyerLastName}
                        onChange={(e) => setFormData({ ...formData, buyerLastName: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="community">Community</Label>
                      <Select value={formData.community} onValueChange={(value) => setFormData({ ...formData, community: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Community" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rolling-meadows">Rolling Meadows</SelectItem>
                          <SelectItem value="cooper-ridge">Cooper Ridge</SelectItem>
                          <SelectItem value="marble-landing">Marble Landing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="lot-number">Lot Number</Label>
                      <Input
                        id="lot-number"
                        placeholder="Enter lot number"
                        value={formData.lotNumber}
                        onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="lot-address">Lot Address</Label>
                      <Input
                        id="lot-address"
                        placeholder="Enter lot address"
                        value={formData.lotAddress}
                        onChange={(e) => setFormData({ ...formData, lotAddress: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="house-plan">House Plan</Label>
                      <Input
                        id="house-plan"
                        value={template.name}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lot-premium">Lot Premium</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">$</span>
                        <Input
                          id="lot-premium"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.lotPremium}
                          onChange={(e) => setFormData({ ...formData, lotPremium: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Base Price Editor */}
                  <Card className="mb-6 bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {template.name} Pricing
                          </h3>
                          <p className="text-sm text-gray-600">Base pricing for this home template</p>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="base-price" className="text-sm font-medium text-gray-700">Price $</Label>
                            <Input
                              id="base-price"
                              type="number"
                              className="w-32 font-semibold"
                              value={parseFloat(template.basePrice)}
                              onChange={(e) => handleBasePriceUpdate(e.target.value)}
                            />
                          </div>
                          {showCostColumns && (
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="base-cost" className="text-sm font-medium text-gray-700">Cost $</Label>
                              <Input
                                id="base-cost"
                                type="number"
                                className="w-32"
                                value={parseFloat(template.baseCost || "0")}
                                onChange={(e) => handleBaseCostUpdate(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </TabsContent>
            ))}
          </Tabs>
        </Card>

        {/* Upgrades Table */}
        <div className="mb-6">
          <UpgradeTable
            groupedUpgrades={groupedUpgrades}
            selectedUpgrades={selectedUpgrades}
            showCostColumns={showCostColumns}
            onUpgradeToggle={handleUpgradeToggle}
            onSelectAll={handleSelectAll}
          />
        </div>

        {/* Order Summary */}
        {currentTemplate && (
          <OrderSummary
            basePrice={currentTemplate.basePrice}
            baseCost={currentTemplate.baseCost || "0"}
            lotPremium={formData.lotPremium}
            selectedUpgrades={selectedUpgradeItems}
            showCostColumns={showCostColumns}
            onSaveDraft={handleSaveDraft}
            onPreview={handlePreview}
            onGeneratePO={handleGeneratePO}
          />
        )}
      </div>
    </div>
  );
}
