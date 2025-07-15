import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Filter, Plus, Minus } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoPath from "@assets/logo-fullColor (1)_1751758486563.png";
import { useToast } from "@/hooks/use-toast";
import { UpgradeTable } from "@/components/upgrade-table";
import { OrderSummary } from "@/components/order-summary";
import { CostTogglePassword } from "@/components/cost-toggle-password";
import { HomeTemplate, Upgrade } from "@shared/schema";
import { groupUpgradesByCategory, sortUpgrades } from "@/lib/upgrade-data";
import { apiRequest } from "@/lib/queryClient";
import { formatNumberWithCommas, handleNumberInputChange } from "@/lib/number-utils";

export default function PurchaseOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [activeTemplate, setActiveTemplate] = useState<string>("2"); // Sorrento ID (now has real data)
  const [showCostColumns, setShowCostColumns] = useState(false); // Off by default
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  
  // Form state
  const [formData, setFormData] = useState({
    todaysDate: new Date().toISOString().split('T')[0],
    buyerLastName: "",
    community: "",
    lotNumber: "",
    lotAddress: "",
    lotPremium: "0",
    salesIncentive: "0",
    designStudioAllowance: "0",
  });

  const [salesIncentiveEnabled, setSalesIncentiveEnabled] = useState(false);

  // Queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery<HomeTemplate[]>({
    queryKey: ["/api/templates"],
  });

  // Current template will be determined later in the component

  const { data: upgrades = [], isLoading: upgradesLoading } = useQuery<Upgrade[]>({
    queryKey: ["/api/upgrades", activeTemplate],
    queryFn: async () => {
      const selectedTemplate = templates.find(t => t.id.toString() === activeTemplate);
      const templateName = selectedTemplate?.name || "";
      const url = templateName ? `/api/upgrades?template=${templateName}` : "/api/upgrades";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch upgrades");
      }
      return response.json();
    },
    enabled: !!templates.length && !!activeTemplate,
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

  const createProposalMutation = useMutation({
    mutationFn: async (proposalData: any) => {
      return await apiRequest("POST", "/api/proposals", proposalData);
    },
    onSuccess: () => {
      toast({
        title: "Proposal Created",
        description: "Your proposal has been generated successfully.",
      });
    },
  });
  
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
  // groupedUpgrades defined later in component

  // Unique categories and locations defined later in component

  // Handlers
  const handleTemplateChange = (templateId: string) => {
    setActiveTemplate(templateId);
    setSelectedUpgrades(new Set()); // Reset selections when switching templates
    
    // Invalidate upgrades query to fetch new template data
    const newTemplate = templates.find(t => t.id.toString() === templateId);
    if (newTemplate) {
      queryClient.invalidateQueries({ queryKey: ["/api/upgrades", newTemplate.name] });
    }
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

  const handleSelectAll = (category: string, location: string, parentSelection?: string) => {
    let upgradesToToggle: Upgrade[] = [];
    
    if (parentSelection) {
      // Select all upgrades in a specific parent selection
      upgradesToToggle = groupedUpgrades[category]?.[location]?.[parentSelection] || [];
    } else {
      // Select all upgrades in a location (all parent selections)
      const locationData = groupedUpgrades[category]?.[location] || {};
      upgradesToToggle = Object.values(locationData).flat();
    }
    
    const allSelected = upgradesToToggle.every(upgrade => selectedUpgrades.has(upgrade.id));
    
    const newSelected = new Set(selectedUpgrades);
    upgradesToToggle.forEach(upgrade => {
      if (allSelected) {
        newSelected.delete(upgrade.id);
      } else {
        newSelected.add(upgrade.id);
      }
    });
    setSelectedUpgrades(newSelected);
  };

  const handleExpandCollapseAll = (isExpanded: boolean) => {
    // This function can be used to expand/collapse all upgrade categories
    // Implementation depends on UpgradeTable component state management
    console.log(`${isExpanded ? 'Expanding' : 'Collapsing'} all categories`);
  };

  const handlePreview = () => {
    // Create a preview window with the purchase order details
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
      description: "Proposal preview opened in new window.",
    });
  };

  const handleExportExcel = async () => {
    if (!currentTemplate) {
      toast({
        title: "Export Failed", 
        description: "Please select a template.",
        variant: "destructive"
      });
      return;
    }

    // Use ExcelJS for proper styling support
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Home Proposal');

    // Set optimal column widths for readability
    worksheet.columns = [
      { width: 50 }, // A - Description/Label
      { width: 20 }, // B - Value/Amount
      { width: 10 }, // C - Spacer
      { width: 10 }, // D - Spacer
      { width: 10 }, // E - Spacer
      { width: 10 }, // F - Spacer
      { width: 10 }, // G - Spacer
      { width: 10 }, // H - Spacer
      { width: 15 }  // I - Secondary Amount
    ];
    
    // Modern Header Design
    const headerRow = worksheet.getRow(1);
    headerRow.height = 40;
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'HOME CONSTRUCTION PROPOSAL';
    headerCell.font = { name: 'Calibri', bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
    headerCell.alignment = { horizontal: 'left', vertical: 'middle' };
    headerCell.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
    
    // Company Information
    const companyRow = worksheet.getRow(2);
    companyRow.height = 25;
    const companyCell = worksheet.getCell('A2');
    companyCell.value = 'BEECHEN & DILL HOMES';
    companyCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF2E5C8A' } };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    companyCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Contact Information
    const contactRow = worksheet.getRow(3);
    contactRow.height = 20;
    const contactCell = worksheet.getCell('A3');
    contactCell.value = '565 Village Center Dr • Burr Ridge, IL 60527-4516 • Phone: (630) 920-9430';
    contactCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF666666' } };
    contactCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Spacer
    worksheet.getRow(4).height = 15;
    
    // Customer Information Section
    const customerHeaderRow = worksheet.getRow(5);
    customerHeaderRow.height = 25;
    const customerHeaderCell = worksheet.getCell('A5');
    customerHeaderCell.value = 'CUSTOMER INFORMATION';
    customerHeaderCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    customerHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    customerHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    customerHeaderCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    // Customer details with clean layout
    const customerDetails = [
      ['Date:', new Date().toLocaleDateString()],
      ['Customer Name:', formData.buyerLastName || 'Not specified'],
      ['Community:', formData.community || 'Not specified'],
      ['Lot Number:', formData.lotNumber || 'TBD'],
      ['Lot Address:', formData.lotAddress || 'TBD'],
      ['Home Plan:', currentTemplate.name]
    ];
    
    let currentRow = 6;
    customerDetails.forEach(([label, value]) => {
      const row = worksheet.getRow(currentRow);
      row.height = 20;
      
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = label;
      labelCell.font = { name: 'Calibri', bold: true, size: 10 };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      labelCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      const valueCell = worksheet.getCell(`B${currentRow}`);
      valueCell.value = value;
      valueCell.font = { name: 'Calibri', size: 10 };
      valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
      valueCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      currentRow++;
    });
    
    // Spacer
    currentRow++;
    
    // Pricing Section Header
    const pricingHeaderRow = worksheet.getRow(currentRow);
    pricingHeaderRow.height = 25;
    const pricingHeaderCell = worksheet.getCell(`A${currentRow}`);
    pricingHeaderCell.value = 'PRICING BREAKDOWN';
    pricingHeaderCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    pricingHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    pricingHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    pricingHeaderCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    currentRow++;
    
    // Base pricing items
    const baseItems = [
      [`${currentTemplate.name} Base Price`, currentTemplate.basePrice],
      ['Lot Premium', formData.lotPremium || "0"],
      ['Design Studio Allowance', formData.designStudioAllowance || "0"]
    ];
    
    // Add Sales Incentive if enabled
    if (salesIncentiveEnabled && formData.salesIncentive !== '0') {
      baseItems.push(['Sales Incentive', formData.salesIncentive]);
    }
    
    baseItems.forEach(([label, amount]) => {
      const row = worksheet.getRow(currentRow);
      row.height = 22;
      
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = label;
      labelCell.font = { name: 'Calibri', bold: true, size: 11 };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      labelCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      const amountCell = worksheet.getCell(`B${currentRow}`);
      amountCell.value = parseInt(amount);
      amountCell.numFmt = '"$"#,##0';
      amountCell.font = { name: 'Calibri', bold: true, size: 11 };
      amountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
      amountCell.alignment = { horizontal: 'right', vertical: 'middle' };
      amountCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      currentRow++;
    });
    
    // Spacer
    currentRow++;
    
    // Upgrades Section Header
    const upgradesHeaderRow = worksheet.getRow(currentRow);
    upgradesHeaderRow.height = 25;
    const upgradesHeaderCell = worksheet.getCell(`A${currentRow}`);
    upgradesHeaderCell.value = 'SELECTED UPGRADES';
    upgradesHeaderCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    upgradesHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    upgradesHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    upgradesHeaderCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    currentRow++;
    
    // Column headers for upgrades
    const upgradeHeaderRow = worksheet.getRow(currentRow);
    upgradeHeaderRow.height = 20;
    
    const optionHeaderCell = worksheet.getCell(`A${currentRow}`);
    optionHeaderCell.value = 'Upgrade Description';
    optionHeaderCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    optionHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
    optionHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    optionHeaderCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    const priceHeaderCell = worksheet.getCell(`B${currentRow}`);
    priceHeaderCell.value = 'Price';
    priceHeaderCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    priceHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
    priceHeaderCell.alignment = { horizontal: 'right', vertical: 'middle' };
    priceHeaderCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    currentRow++;
    
    // Add upgrades with clean formatting
    const selectedGroupedUpgrades = groupUpgradesByCategory(selectedUpgradeItems);
    
    Object.entries(selectedGroupedUpgrades).forEach(([category, locations]) => {
      // Category Header
      const categoryRow = worksheet.getRow(currentRow);
      categoryRow.height = 25;
      
      const categoryCell = worksheet.getCell(`A${currentRow}`);
      categoryCell.value = category.toUpperCase();
      categoryCell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      categoryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
      categoryCell.alignment = { horizontal: 'left', vertical: 'middle' };
      categoryCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      currentRow++;
      
      Object.entries(locations).forEach(([location, parentSelections]) => {
        Object.entries(parentSelections).forEach(([parentSelection, upgrades]) => {
          // Add each upgrade item
          upgrades.forEach((upgrade, index) => {
            const row = worksheet.getRow(currentRow);
            row.height = 20;
            
            // Clean alternating row colors
            const isEvenRow = index % 2 === 0;
            const bgColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF';
            
            // Upgrade description
            const descCell = worksheet.getCell(`A${currentRow}`);
            descCell.value = `${upgrade.choiceTitle} (${location})`;
            descCell.font = { name: 'Calibri', size: 10 };
            descCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            descCell.alignment = { horizontal: 'left', vertical: 'middle' };
            descCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            
            // Price
            const priceCell = worksheet.getCell(`B${currentRow}`);
            priceCell.value = parseInt(upgrade.clientPrice);
            priceCell.numFmt = '"$"#,##0';
            priceCell.font = { name: 'Calibri', size: 10 };
            priceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            priceCell.alignment = { horizontal: 'right', vertical: 'middle' };
            priceCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            
            currentRow++;
          });
        });
      });
    });
    
    // Spacer
    currentRow += 2;
    
    // Summary Section
    const summaryHeaderRow = worksheet.getRow(currentRow);
    summaryHeaderRow.height = 25;
    const summaryHeaderCell = worksheet.getCell(`A${currentRow}`);
    summaryHeaderCell.value = 'TOTAL SUMMARY';
    summaryHeaderCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    summaryHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    summaryHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    summaryHeaderCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    currentRow++;
    
    // Base Subtotal
    const baseSubtotalRow = worksheet.getRow(currentRow);
    baseSubtotalRow.height = 22;
    const baseSubtotalLabel = worksheet.getCell(`A${currentRow}`);
    baseSubtotalLabel.value = 'Base Subtotal:';
    baseSubtotalLabel.font = { name: 'Calibri', bold: true, size: 11 };
    baseSubtotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
    baseSubtotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    baseSubtotalLabel.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    const baseSubtotalValue = worksheet.getCell(`B${currentRow}`);
    const baseSubtotal = parseInt(currentTemplate.basePrice) + parseInt(formData.lotPremium || "0") + parseInt(formData.designStudioAllowance || "0") + (salesIncentiveEnabled ? parseInt(formData.salesIncentive || "0") : 0);
    baseSubtotalValue.value = baseSubtotal;
    baseSubtotalValue.numFmt = '"$"#,##0';
    baseSubtotalValue.font = { name: 'Calibri', bold: true, size: 11 };
    baseSubtotalValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
    baseSubtotalValue.alignment = { horizontal: 'right', vertical: 'middle' };
    baseSubtotalValue.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    currentRow++;
    
    // Upgrades Subtotal
    const upgradesSubtotalRow = worksheet.getRow(currentRow);
    upgradesSubtotalRow.height = 22;
    const upgradesSubtotalLabel = worksheet.getCell(`A${currentRow}`);
    upgradesSubtotalLabel.value = 'Upgrades Subtotal:';
    upgradesSubtotalLabel.font = { name: 'Calibri', bold: true, size: 11 };
    upgradesSubtotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
    upgradesSubtotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    upgradesSubtotalLabel.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    const upgradesSubtotalValue = worksheet.getCell(`B${currentRow}`);
    const upgradesSubtotal = selectedUpgradeItems.reduce((sum, upgrade) => sum + parseInt(upgrade.clientPrice), 0);
    upgradesSubtotalValue.value = upgradesSubtotal;
    upgradesSubtotalValue.numFmt = '"$"#,##0';
    upgradesSubtotalValue.font = { name: 'Calibri', bold: true, size: 11 };
    upgradesSubtotalValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
    upgradesSubtotalValue.alignment = { horizontal: 'right', vertical: 'middle' };
    upgradesSubtotalValue.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    currentRow++;
    
    // Grand Total
    const grandTotalRow = worksheet.getRow(currentRow);
    grandTotalRow.height = 30;
    const grandTotalLabel = worksheet.getCell(`A${currentRow}`);
    grandTotalLabel.value = 'GRAND TOTAL:';
    grandTotalLabel.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    grandTotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
    grandTotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    grandTotalLabel.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
    
    const grandTotalValue = worksheet.getCell(`B${currentRow}`);
    const grandTotal = baseSubtotal + upgradesSubtotal;
    grandTotalValue.value = grandTotal;
    grandTotalValue.numFmt = '"$"#,##0';
    grandTotalValue.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    grandTotalValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
    grandTotalValue.alignment = { horizontal: 'right', vertical: 'middle' };
    grandTotalValue.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
    
    currentRow += 3;
    
    // Signature Section
    const signatureRow = worksheet.getRow(currentRow);
    signatureRow.height = 20;
    const signatureCell = worksheet.getCell(`A${currentRow}`);
    signatureCell.value = 'By signing below, both parties agree to the terms and total amount shown above.';
    signatureCell.font = { name: 'Calibri', size: 10, italic: true };
    signatureCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    currentRow += 2;
    
    // Customer Signature Line
    const customerSigRow = worksheet.getRow(currentRow);
    customerSigRow.height = 25;
    const customerSigLabel = worksheet.getCell(`A${currentRow}`);
    customerSigLabel.value = 'Customer Signature:';
    customerSigLabel.font = { name: 'Calibri', bold: true, size: 10 };
    customerSigLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    
    const customerSigLine = worksheet.getCell(`B${currentRow}`);
    customerSigLine.value = '____________________________';
    customerSigLine.font = { name: 'Calibri', size: 10 };
    customerSigLine.alignment = { horizontal: 'center', vertical: 'middle' };
    
    currentRow += 2;
    
    // Customer Date Line
    const customerDateRow = worksheet.getRow(currentRow);
    customerDateRow.height = 25;
    const customerDateLabel = worksheet.getCell(`A${currentRow}`);
    customerDateLabel.value = 'Date:';
    customerDateLabel.font = { name: 'Calibri', bold: true, size: 10 };
    customerDateLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    
    const customerDateLine = worksheet.getCell(`B${currentRow}`);
    customerDateLine.value = '___________';
    customerDateLine.font = { name: 'Calibri', size: 10 };
    customerDateLine.alignment = { horizontal: 'center', vertical: 'middle' };
    
    currentRow += 2;
    
    // Sales Representative Signature Line
    const salesSigRow = worksheet.getRow(currentRow);
    salesSigRow.height = 25;
    const salesSigLabel = worksheet.getCell(`A${currentRow}`);
    salesSigLabel.value = 'Sales Representative:';
    salesSigLabel.font = { name: 'Calibri', bold: true, size: 10 };
    salesSigLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    
    const salesSigLine = worksheet.getCell(`B${currentRow}`);
    salesSigLine.value = '____________________________';
    salesSigLine.font = { name: 'Calibri', size: 10 };
    salesSigLine.alignment = { horizontal: 'center', vertical: 'middle' };
    
    currentRow += 2;
    
    // Sales Representative Date Line
    const salesDateRow = worksheet.getRow(currentRow);
    salesDateRow.height = 25;
    const salesDateLabel = worksheet.getCell(`A${currentRow}`);
    salesDateLabel.value = 'Date:';
    salesDateLabel.font = { name: 'Calibri', bold: true, size: 10 };
    salesDateLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    
    const salesDateLine = worksheet.getCell(`B${currentRow}`);
    salesDateLine.value = '___________';
    salesDateLine.font = { name: 'Calibri', size: 10 };
    salesDateLine.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Save the workbook
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.buyerLastName || 'Customer'}_Proposal_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
    
    toast({
      title: "Excel Export Complete",
      description: "Proposal exported successfully.",
    });
  };

  const handleSaveDraft = async () => {
    if (!currentTemplate) return;
    
    const proposalData = {
      templateId: currentTemplate.id,
      buyerLastName: formData.buyerLastName,
      community: formData.community,
      lotNumber: formData.lotNumber,
      lotAddress: formData.lotAddress,
      lotPremium: formData.lotPremium,
      salesIncentive: formData.salesIncentive,
      designStudioAllowance: formData.designStudioAllowance,
      selectedUpgrades: Array.from(selectedUpgrades),
      isDraft: true
    };

    try {
      await apiRequest('/api/proposals', {
        method: 'POST',
        body: JSON.stringify(proposalData)
      });
      
      toast({
        title: "Draft Saved",
        description: "Your proposal has been saved as a draft.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePO = async () => {
    if (!currentTemplate) return;
    
    const proposalData = {
      templateId: currentTemplate.id,
      buyerLastName: formData.buyerLastName,
      community: formData.community,
      lotNumber: formData.lotNumber,
      lotAddress: formData.lotAddress,
      lotPremium: formData.lotPremium,
      salesIncentive: formData.salesIncentive,
      designStudioAllowance: formData.designStudioAllowance,
      selectedUpgrades: Array.from(selectedUpgrades),
      isDraft: false
    };

    try {
      await apiRequest('/api/proposals', {
        method: 'POST',
        body: JSON.stringify(proposalData)
      });
      
      toast({
        title: "Proposal Generated",
        description: "Your proposal has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate proposal. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCostToggle = (checked: boolean) => {
    if (checked) {
      setShowPasswordDialog(true);
    } else {
      setShowCostColumns(false);
    }
  };

  const handleCostAuthenticated = () => {
    setShowCostColumns(true);
    setShowPasswordDialog(false);
    toast({
      title: "Cost View Enabled",
      description: "Builder costs and margins are now visible.",
    });
  };

  if (templatesLoading) {
    return <div className="flex justify-center items-center h-64">Loading templates...</div>;
  }

  if (!templates?.length) {
    return <div className="flex justify-center items-center h-64">No templates available</div>;
  }

  const currentTemplate = templates.find(t => t.id.toString() === activeTemplate) || templates[0];
  const selectedUpgradeItems = upgrades?.filter(upgrade => selectedUpgrades.has(upgrade.id)) || [];
  
  // Group and filter upgrades
  const groupedUpgrades = groupUpgradesByCategory(
    upgrades?.filter(upgrade => {
      const matchesSearch = searchTerm === "" || 
        upgrade.choiceTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || upgrade.category === categoryFilter;
      const matchesLocation = locationFilter === "all" || upgrade.location === locationFilter;
      return matchesSearch && matchesCategory && matchesLocation;
    }) || []
  );

  // Get unique categories and locations for filters
  const uniqueCategories = Array.from(new Set(upgrades?.map(u => u.category) || [])).sort();
  const uniqueLocations = Array.from(new Set(upgrades?.map(u => u.location) || [])).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proposal Generator</h1>
          <p className="text-gray-600">Create detailed proposals with home templates and upgrades</p>
        </div>

        {/* Template Selection */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Select Home Template</h2>
              <div className="flex items-center space-x-3">
                <Label htmlFor="cost-toggle" className="text-sm text-gray-700 font-medium">
                  Show Builder Cost & Margin
                </Label>
                <Switch
                  id="cost-toggle"
                  checked={showCostColumns}
                  onCheckedChange={handleCostToggle}
                />
                {salesIncentiveEnabled && (
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    SA
                  </div>
                )}
              </div>
            </div>

            <Tabs 
              value={activeTemplate || templates[0]?.id.toString()}
              onValueChange={(value) => setActiveTemplate(value)}
            >
              <TabsList className="grid w-full grid-cols-3">
                {templates.map((template) => (
                  <TabsTrigger key={template.id} value={template.id.toString()}>
                    {template.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {templates.map((template) => (
                <TabsContent key={template.id} value={template.id.toString()}>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="buyer-name">Buyer's Last Name</Label>
                          <Input
                            id="buyer-name"
                            placeholder="Enter buyer's last name"
                            value={formData.buyerLastName}
                            onChange={(e) => setFormData({ ...formData, buyerLastName: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="community">Community</Label>
                          <Select 
                            value={formData.community} 
                            onValueChange={(value) => setFormData({ ...formData, community: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select community" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rolling-meadows">Rolling Meadows</SelectItem>
                              <SelectItem value="marble-landing">Marble Landing</SelectItem>
                              <SelectItem value="copper-ridge">Copper Ridge</SelectItem>
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
                            </div>
                          </div>

                        </CardContent>
                      </Card>

                      {/* Lot Premium */}
                      <Card className="mb-4 bg-white border-gray-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-md font-medium text-gray-900">Lot Premium</h4>
                              <p className="text-sm text-gray-600">Additional cost for lot location</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="lot-premium" className="text-sm font-medium text-gray-700">Amount $</Label>
                              <Input
                                id="lot-premium"
                                type="text"
                                className="w-32"
                                placeholder="0"
                                value={formatNumberWithCommas(formData.lotPremium)}
                                onChange={(e) => handleNumberInputChange(e.target.value, (value) => setFormData({ ...formData, lotPremium: value }))}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Sales Incentive - Hidden by default */}
                      {salesIncentiveEnabled ? (
                        <Card className="mb-4 bg-white border-gray-200">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-md font-medium text-gray-900">Sales Incentive</h4>
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">SA</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFormData({ ...formData, salesIncentive: "0" });
                                    setSalesIncentiveEnabled(false);
                                  }}
                                  className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Label htmlFor="sales-incentive" className="text-sm font-medium text-gray-700">Amount $</Label>
                                <Input
                                  id="sales-incentive"
                                  type="text"
                                  className="w-32"
                                  placeholder="-0"
                                  value={formatNumberWithCommas(formData.salesIncentive)}
                                  onChange={(e) => {
                                    handleNumberInputChange(e.target.value, (value) => {
                                      // Ensure sales incentive is negative
                                      const numValue = parseFloat(value) || 0;
                                      const negativeValue = numValue > 0 ? (-numValue).toString() : value;
                                      setFormData({ ...formData, salesIncentive: negativeValue });
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        // Discrete activation area - subtle but findable for staff
                        <div 
                          className="mb-4 h-6 cursor-pointer group flex items-center justify-center"
                          onClick={() => {
                            setFormData({ ...formData, salesIncentive: "-0" });
                            setSalesIncentiveEnabled(true);
                          }}
                          title="Click to add sales incentive"
                        >
                          <div className="opacity-60 group-hover:opacity-90 transition-opacity duration-200 text-lg text-gray-600 select-none font-bold">
                            ···
                          </div>
                        </div>
                      )}

                      {/* Design Studio Allowance */}
                      <Card className="mb-4 bg-white border-gray-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-md font-medium text-gray-900">Design Studio Allowance</h4>
                              <p className="text-sm text-gray-600">Credit for design studio selections</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="design-studio-allowance" className="text-sm font-medium text-gray-700">Amount $</Label>
                              <Input
                                id="design-studio-allowance"
                                type="text"
                                className="w-32"
                                placeholder="0"
                                value={formatNumberWithCommas(formData.designStudioAllowance)}
                                onChange={(e) => handleNumberInputChange(e.target.value, (value) => setFormData({ ...formData, designStudioAllowance: value }))}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
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

                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchTerm("");
                          setCategoryFilter("all");
                          setLocationFilter("all");
                        }}
                        className="h-10"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upgrades Table */}
            <Card>
              <CardContent>
                <UpgradeTable
                  groupedUpgrades={groupedUpgrades}
                  selectedUpgrades={selectedUpgrades}
                  showCostColumns={showCostColumns}
                  onUpgradeToggle={handleUpgradeToggle}
                  onSelectAll={handleSelectAll}
                  onExpandCollapseAll={handleExpandCollapseAll}
                />

                {/* Order Summary */}
                {currentTemplate && (
                  <OrderSummary
                    basePrice={currentTemplate.basePrice}
                    baseCost={currentTemplate.baseCost || "0"}
                    lotPremium={formData.lotPremium}
                    salesIncentive={formData.salesIncentive}
                    salesIncentiveEnabled={salesIncentiveEnabled}
                    designStudioAllowance={formData.designStudioAllowance}
                    selectedUpgrades={selectedUpgradeItems}
                    showCostColumns={showCostColumns}
                    onSaveDraft={handleSaveDraft}
                    onPreview={handlePreview}
                    onExportExcel={handleExportExcel}
                    onGenerateProposal={handleGeneratePO}
                  />
                )}

                {/* Cost Toggle Password Dialog */}
                <CostTogglePassword
                  isOpen={showPasswordDialog}
                  onClose={() => setShowPasswordDialog(false)}
                  onAuthenticated={handleCostAuthenticated}
                />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
