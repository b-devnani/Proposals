import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Filter } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from "@/hooks/use-toast";
import { UpgradeTable } from "@/components/upgrade-table";
import { OrderSummary } from "@/components/order-summary";
import { HomeTemplate, Upgrade } from "@shared/schema";
import { groupUpgradesByCategory, sortUpgrades } from "@/lib/upgrade-data";
import { apiRequest } from "@/lib/queryClient";
import { formatNumberWithCommas, handleNumberInputChange } from "@/lib/number-utils";

export default function PurchaseOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [activeTemplate, setActiveTemplate] = useState<string>("1"); // Ravello ID
  const [showCostColumns, setShowCostColumns] = useState(true);
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  
  // Form state
  const [formData, setFormData] = useState({
    todaysDate: new Date().toISOString().split('T')[0],
    buyerLastName: "",
    buyerFirstName: "",
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
  
  // Process upgrades with search and filters
  const filteredUpgrades = upgrades.filter(upgrade => {
    // Search filter
    const matchesSearch = searchTerm === "" || 
      upgrade.choiceTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = categoryFilter === "all" || 
      upgrade.category === categoryFilter;
    
    // Location filter
    const matchesLocation = locationFilter === "all" || 
      upgrade.location === locationFilter;
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const sortedUpgrades = sortUpgrades(filteredUpgrades);
  const groupedUpgrades = groupUpgradesByCategory(sortedUpgrades);
  const selectedUpgradeItems = upgrades.filter(upgrade => selectedUpgrades.has(upgrade.id));

  // Get unique categories and locations for filter dropdowns
  const uniqueCategories = Array.from(new Set(upgrades.map(u => u.category))).sort();
  const uniqueLocations = Array.from(new Set(upgrades.map(u => u.location))).sort();

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
    // Create a preview window with the purchase order details
    const orderData = {
      template: currentTemplate,
      buyer: {
        firstName: formData.buyerFirstName,
        lastName: formData.buyerLastName,
      },
      community: formData.community,
      lot: {
        address: formData.lotAddress,
        premium: formData.lotPremium || "0",
      },
      upgrades: selectedUpgradeItems,
      totals: {
        basePrice: currentTemplate?.basePrice || "0",
        lotPremium: formData.lotPremium || "0",
        upgradesTotal: selectedUpgradeItems.reduce((sum, upgrade) => sum + parseInt(upgrade.clientPrice), 0),
        grandTotal: parseInt(currentTemplate?.basePrice || "0") + 
                   parseInt(formData.lotPremium || "0") + 
                   selectedUpgradeItems.reduce((sum, upgrade) => sum + parseInt(upgrade.clientPrice), 0)
      }
    };

    // Open preview in new window
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>Purchase Order Preview</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              .section h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
              .row { display: flex; justify-content: space-between; margin: 5px 0; }
              .total { font-weight: bold; font-size: 1.2em; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Purchase Order Preview</h1>
              <p>Date: ${formData.todaysDate}</p>
            </div>
            
            <div class="section">
              <h3>Buyer Information</h3>
              <div class="row"><span>Name:</span><span>${orderData.buyer.lastName}</span></div>
              <div class="row"><span>Community:</span><span>${orderData.community}</span></div>
              <div class="row"><span>Lot Address:</span><span>${orderData.lot.address}</span></div>
            </div>

            <div class="section">
              <h3>Home Template</h3>
              <div class="row"><span>Model:</span><span>${orderData.template?.name}</span></div>
              <div class="row"><span>Base Price:</span><span>$${parseInt(orderData.totals.basePrice).toLocaleString()}</span></div>
              <div class="row"><span>Lot Premium:</span><span>$${parseInt(orderData.lot.premium).toLocaleString()}</span></div>
            </div>

            <div class="section">
              <h3>Selected Upgrades</h3>
              <table>
                <thead>
                  <tr>
                    <th>Choice Title</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderData.upgrades.map(upgrade => `
                    <tr>
                      <td>${upgrade.choiceTitle}</td>
                      <td>${upgrade.category}</td>
                      <td>${upgrade.location}</td>
                      <td>$${parseInt(upgrade.clientPrice).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h3>Total Summary</h3>
              <div class="row"><span>Base Price:</span><span>$${parseInt(orderData.totals.basePrice).toLocaleString()}</span></div>
              <div class="row"><span>Lot Premium:</span><span>$${parseInt(orderData.lot.premium).toLocaleString()}</span></div>
              <div class="row"><span>Upgrades Total:</span><span>$${orderData.totals.upgradesTotal.toLocaleString()}</span></div>
              <div class="row total"><span>Grand Total:</span><span>$${orderData.totals.grandTotal.toLocaleString()}</span></div>
            </div>
          </body>
        </html>
      `);
      previewWindow.document.close();
    }

    toast({
      title: "Preview Generated",
      description: "Purchase order preview opened in new window.",
    });
  };

  const handleExportExcel = () => {
    if (!currentTemplate) return;

    const orderData = {
      template: currentTemplate,
      buyer: {
        lastName: formData.buyerLastName,
      },
      community: formData.community,
      lot: {
        address: formData.lotAddress,
        premium: formData.lotPremium || "0",
      },
      date: formData.todaysDate,
    };

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Order Summary Sheet
    const summaryData = [
      ['Purchase Order Summary'],
      [''],
      ['Date:', orderData.date],
      ['Buyer Name:', orderData.buyer.lastName],
      ['Community:', orderData.community],
      ['Lot Address:', orderData.lot.address],
      [''],
      ['Home Template:', currentTemplate.name],
      ['Base Price:', parseInt(currentTemplate.basePrice)],
      ['Lot Premium:', parseInt(orderData.lot.premium)],
      [''],
      ['TOTALS:'],
      ['Base Price:', parseInt(currentTemplate.basePrice)],
      ['Lot Premium:', parseInt(orderData.lot.premium)],
      ['Upgrades Total:', selectedUpgradeItems.reduce((sum, u) => sum + parseInt(u.clientPrice), 0)],
      ['Grand Total:', parseInt(currentTemplate.basePrice) + parseInt(orderData.lot.premium) + selectedUpgradeItems.reduce((sum, u) => sum + parseInt(u.clientPrice), 0)]
    ];

    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Order Summary');

    // Upgrades Sheet
    if (selectedUpgradeItems.length > 0) {
      const upgradesData = [
        ['Selection ID', 'Choice ID', 'Choice Title', 'Category', 'Location', 'Builder Cost', 'Client Price', 'Margin %'],
        ...selectedUpgradeItems.map(upgrade => [
          upgrade.selectionId,
          upgrade.choiceId,
          upgrade.choiceTitle,
          upgrade.category,
          upgrade.location,
          parseInt(upgrade.builderCost),
          parseInt(upgrade.clientPrice),
          parseFloat(upgrade.margin)
        ])
      ];

      const upgradesWS = XLSX.utils.aoa_to_sheet(upgradesData);
      XLSX.utils.book_append_sheet(wb, upgradesWS, 'Selected Upgrades');
    }

    // Generate filename
    const filename = `PO_${orderData.buyer.lastName || 'Buyer'}_${orderData.date.replace(/-/g, '')}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);

    toast({
      title: "Excel Export Complete",
      description: `Purchase order exported as ${filename}`,
    });
  };

  const handleGeneratePO = () => {
    if (!currentTemplate) return;

    // Create PDF
    const pdf = new jsPDF();
    
    // Company Header
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("BEECHEN&DILL", 105, 25, { align: "center" });
    pdf.setFontSize(14);
    pdf.text("HOMES", 105, 32, { align: "center" });
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text("Beechen and Dill Homes", 105, 42, { align: "center" });
    
    pdf.setFontSize(10);
    pdf.text("565 Village Center Dr    •    Burr Ridge, IL 60527-4516    •    Phone: 6309209430", 105, 50, { align: "center" });
    
    // Job Address Section
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("DESIGNER HOME", 20, 70);
    pdf.setFont("helvetica", "normal");
    pdf.text("Job Address:", 20, 80);
    pdf.text("16520 Kayla Drive", 20, 88);
    pdf.text("Lemont, IL 60439", 20, 96);
    
    // Purchase Order Title
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("PURCHASE ORDER", 105, 115, { align: "center" });
    
    // Buyer Information
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("BUYER INFORMATION", 20, 135);
    
    pdf.setFont("helvetica", "normal");
    let yPos = 145;
    pdf.text(`Date: ${formData.todaysDate}`, 20, yPos);
    yPos += 8;
    pdf.text(`Buyer Name: ${formData.buyerFirstName} ${formData.buyerLastName}`, 20, yPos);
    yPos += 8;
    pdf.text(`Community: ${formData.community}`, 20, yPos);
    yPos += 8;
    pdf.text(`Lot Number: ${formData.lotNumber}`, 20, yPos);
    yPos += 8;
    pdf.text(`Lot Address: ${formData.lotAddress}`, 20, yPos);
    yPos += 15;
    
    // Home Template Information
    pdf.setFont("helvetica", "bold");
    pdf.text("HOME TEMPLATE", 20, yPos);
    yPos += 10;
    
    pdf.setFont("helvetica", "normal");
    pdf.text(`Model: ${currentTemplate.name}`, 20, yPos);
    yPos += 8;
    pdf.text(`Base Price: $${parseInt(currentTemplate.basePrice).toLocaleString()}`, 20, yPos);
    yPos += 8;
    if (formData.lotPremium && parseInt(formData.lotPremium) > 0) {
      pdf.text(`Lot Premium: $${parseInt(formData.lotPremium).toLocaleString()}`, 20, yPos);
      yPos += 15;
    } else {
      yPos += 8;
    }
    
    // Selected Upgrades Table
    if (selectedUpgradeItems.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.text("SELECTED UPGRADES", 20, yPos);
      yPos += 10;
      
      const upgradeTableData = selectedUpgradeItems.map(upgrade => [
        upgrade.choiceTitle,
        upgrade.category,
        upgrade.location,
        `$${parseInt(upgrade.clientPrice).toLocaleString()}`
      ]);
      
      (pdf as any).autoTable({
        startY: yPos,
        head: [['Choice Title', 'Category', 'Location', 'Price']],
        body: upgradeTableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 40 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25, halign: 'right' }
        }
      });
      
      yPos = (pdf as any).lastAutoTable.finalY + 15;
    }
    
    // Pricing Summary
    const basePrice = parseInt(currentTemplate.basePrice);
    const lotPremium = parseInt(formData.lotPremium || "0");
    const upgradesTotal = selectedUpgradeItems.reduce((sum, u) => sum + parseInt(u.clientPrice), 0);
    const grandTotal = basePrice + lotPremium + upgradesTotal;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("PRICING SUMMARY", 120, yPos);
    yPos += 10;
    
    pdf.setFont("helvetica", "normal");
    pdf.text(`Base Price:`, 120, yPos);
    pdf.text(`$${basePrice.toLocaleString()}`, 170, yPos, { align: "right" });
    yPos += 8;
    
    if (lotPremium > 0) {
      pdf.text(`Lot Premium:`, 120, yPos);
      pdf.text(`$${lotPremium.toLocaleString()}`, 170, yPos, { align: "right" });
      yPos += 8;
    }
    
    if (upgradesTotal > 0) {
      pdf.text(`Upgrades Total:`, 120, yPos);
      pdf.text(`$${upgradesTotal.toLocaleString()}`, 170, yPos, { align: "right" });
      yPos += 8;
    }
    
    // Grand Total
    pdf.setFont("helvetica", "bold");
    pdf.line(120, yPos, 170, yPos);
    yPos += 8;
    pdf.text(`TOTAL:`, 120, yPos);
    pdf.text(`$${grandTotal.toLocaleString()}`, 170, yPos, { align: "right" });
    yPos += 20;
    
    // Signature Section
    if (yPos > 250) {
      pdf.addPage();
      yPos = 30;
    }
    
    pdf.setFont("helvetica", "bold");
    pdf.text("SIGNATURES", 20, yPos);
    yPos += 20;
    
    // Buyer Signature
    pdf.setFont("helvetica", "normal");
    pdf.text("Buyer Signature:", 20, yPos);
    pdf.text("Date:", 120, yPos);
    pdf.line(20, yPos + 15, 100, yPos + 15);
    pdf.line(120, yPos + 15, 180, yPos + 15);
    yPos += 30;
    
    // Company Representative Signature
    pdf.text("Beechen & Dill Homes Representative:", 20, yPos);
    pdf.text("Date:", 120, yPos);
    pdf.line(20, yPos + 15, 100, yPos + 15);
    pdf.line(120, yPos + 15, 180, yPos + 15);
    
    // Footer
    pdf.setFontSize(8);
    pdf.text("This purchase order constitutes the complete agreement between the parties.", 105, 280, { align: "center" });
    
    // Save PDF
    const filename = `PurchaseOrder_${formData.buyerLastName || 'Buyer'}_${formData.todaysDate.replace(/-/g, '')}.pdf`;
    pdf.save(filename);

    // Also save to database
    const orderData = {
      ...formData,
      housePlan: currentTemplate.name,
      basePrice: currentTemplate.basePrice,
      lotPremium: formData.lotPremium || "0",
      selectedUpgrades: Array.from(selectedUpgrades).map(String),
      totalPrice: grandTotal.toString(),
    };

    createPurchaseOrderMutation.mutate(orderData);

    toast({
      title: "Purchase Order Generated",
      description: `PDF generated: ${filename}`,
    });
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
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
                      <Label htmlFor="buyer-first-name">Buyer's First Name</Label>
                      <Input
                        id="buyer-first-name"
                        placeholder="Enter first name"
                        value={formData.buyerFirstName}
                        onChange={(e) => setFormData({ ...formData, buyerFirstName: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="buyer-last-name">Buyer's Last Name</Label>
                      <Input
                        id="buyer-last-name"
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
                          type="text"
                          placeholder="0"
                          value={formatNumberWithCommas(formData.lotPremium)}
                          onChange={(e) => handleNumberInputChange(e.target.value, (value) => setFormData({ ...formData, lotPremium: value }))}
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
                              type="text"
                              className="w-40 font-semibold"
                              value={formatNumberWithCommas(template.basePrice)}
                              onChange={(e) => handleNumberInputChange(e.target.value, handleBasePriceUpdate)}
                            />
                          </div>
                          {showCostColumns && (
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="base-cost" className="text-sm font-medium text-gray-700">Cost $</Label>
                              <Input
                                id="base-cost"
                                type="text"
                                className="w-40"
                                value={formatNumberWithCommas(template.baseCost || "0")}
                                onChange={(e) => handleNumberInputChange(e.target.value, handleBaseCostUpdate)}
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

        {/* Search and Filter Controls */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Search Upgrades
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by choice title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div>
                  <Label htmlFor="category-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                    Category
                  </Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {uniqueCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                    Location
                  </Label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredUpgrades.length} of {upgrades.length} upgrades
              {searchTerm && ` matching "${searchTerm}"`}
              {categoryFilter !== "all" && ` in ${categoryFilter}`}
              {locationFilter !== "all" && ` at ${locationFilter}`}
            </div>
          </CardContent>
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
            onExportExcel={handleExportExcel}
            onGeneratePO={handleGeneratePO}
          />
        )}
      </div>
    </div>
  );
}
