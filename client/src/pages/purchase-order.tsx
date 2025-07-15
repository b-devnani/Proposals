import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Filter } from "lucide-react";
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
    const worksheet = workbook.addWorksheet('Order Summary');

    // selectedUpgradeItems already defined in component scope
    
    // Set column widths to match template exactly
    worksheet.columns = [
      { width: 15 }, // A - Option
      { width: 15 }, // B - Form labels  
      { width: 5 },  // C - Spacer
      { width: 15 }, // D - Form data
      { width: 20 }, // E - Description start
      { width: 20 }, // F
      { width: 20 }, // G  
      { width: 20 }, // H - Summary labels
      { width: 15 }  // I - Subtotal/Values
    ];
    
    // Title: A1:I1 - "PROPOSAL" - Blue background, white text, centered, bold, 16pt Calibri
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'PROPOSAL';
    titleCell.font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    worksheet.mergeCells('A1:I1');
    worksheet.getRow(1).height = 30;
    
    // Company Name: A3:I3 - "• BEECHEN & DILL HOMES •" - Light blue background, dark blue text, centered, bold, 14pt Calibri
    const companyCell = worksheet.getCell('A3');
    companyCell.value = '• BEECHEN & DILL HOMES •';
    companyCell.font = { bold: true, size: 14, color: { argb: 'FF366092' } };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3FF' } };
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('A3:I3');
    worksheet.getRow(3).height = 25;
    
    // Address line
    worksheet.getCell('A7').value = '565 Village Center Dr';
    worksheet.getCell('C7').value = '•';
    worksheet.getCell('D7').value = 'Burr Ridge, IL 60527-4516';
    worksheet.getCell('G7').value = '•';
    worksheet.getCell('H7').value = 'Phone: (630) 920-9430';
    worksheet.mergeCells('A7:I7');


    // Form data section with gray labels
    const formLabels = [
      ['B9', 'Date', 'E9', new Date().toLocaleDateString()],
      ['B10', "Buyer's Last Name", 'E10', formData.buyerLastName || ''],
      ['B11', 'Community', 'E11', formData.community || ''],
      ['B12', 'Lot Number', 'E12', formData.lotNumber || ''],
      ['B13', 'Lot Address', 'E13', formData.lotAddress || ''],
      ['B14', 'House Plan', 'E14', currentTemplate.name]
    ];
    
    formLabels.forEach(([labelCell, labelText, valueCell, valueText]) => {
      const label = worksheet.getCell(labelCell);
      label.value = labelText;
      label.font = { bold: true };
      label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      
      const value = worksheet.getCell(valueCell);
      value.value = valueText;
    });
    
    // Base pricing with light blue background
    const basePriceLabel = worksheet.getCell('E16');
    basePriceLabel.value = `${currentTemplate.name} Base Price`;
    basePriceLabel.font = { bold: true };
    basePriceLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } };
    
    const basePriceValue = worksheet.getCell('I16');
    basePriceValue.value = parseInt(currentTemplate.basePrice);
    basePriceValue.numFmt = '"$"#,##0';
    basePriceValue.font = { bold: true };
    basePriceValue.alignment = { horizontal: 'right' };
    
    const lotPremiumLabel = worksheet.getCell('E17');
    lotPremiumLabel.value = 'Lot Premium';
    lotPremiumLabel.font = { bold: true };
    lotPremiumLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } };
    
    const lotPremiumValue = worksheet.getCell('I17');
    lotPremiumValue.value = parseInt(formData.lotPremium || "0");
    lotPremiumValue.numFmt = '"$"#,##0';
    lotPremiumValue.font = { bold: true };
    lotPremiumValue.alignment = { horizontal: 'right' };
    
    // Headers with blue background and white text
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    
    const optionHeader = worksheet.getCell('A19');
    optionHeader.value = 'Option';
    Object.assign(optionHeader, headerStyle);
    worksheet.mergeCells('A19:D19');
    
    const descHeader = worksheet.getCell('E19');
    descHeader.value = 'Description/Notes';
    Object.assign(descHeader, headerStyle);
    worksheet.mergeCells('E19:H19');
    
    const subtotalHeader = worksheet.getCell('I19');
    subtotalHeader.value = 'Subtotal';
    Object.assign(subtotalHeader, headerStyle);
    
    worksheet.getRow(19).height = 20;
    
    // Track current row for upgrades
    let currentRow = 20;
    
    // Group only selected upgrades by category and location
    const selectedGroupedUpgrades = groupUpgradesByCategory(selectedUpgradeItems);
    
    Object.entries(selectedGroupedUpgrades).forEach(([category, locations]) => {
      // Category Header with exact mapping - Blue background, white text, bold, borders spanning full row
      const categoryRow = worksheet.getRow(currentRow);
      const categoryCell = categoryRow.getCell(1);
      categoryCell.value = category;
      categoryCell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
      categoryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
      categoryCell.alignment = { horizontal: 'left', vertical: 'middle' };
      categoryCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      // Fill remaining cells in category row with same styling
      for (let col = 2; col <= 9; col++) {
        const cell = categoryRow.getCell(col);
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      }
      currentRow++;
      
      Object.entries(locations).forEach(([location, parentSelections]) => {
        // Location Header (if not N/A) with exact mapping - Light gray background, italic, bold, borders spanning full row
        if (location !== "N/A") {
          const locationRow = worksheet.getRow(currentRow);
          const locationCell = locationRow.getCell(1);
          locationCell.value = location;
          locationCell.font = { name: 'Calibri', bold: true, italic: true };
          locationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
          locationCell.alignment = { horizontal: 'left', vertical: 'middle' };
          locationCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          
          // Fill remaining cells in location row with same styling
          for (let col = 2; col <= 9; col++) {
            const cell = locationRow.getCell(col);
            cell.font = { name: 'Calibri', bold: true, italic: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          }
          currentRow++;
        }
        
        // Iterate through parent selections and their upgrades
        Object.entries(parentSelections).forEach(([parentSelection, upgrades]) => {
          // Parent Selection header (if meaningful and different from location)
          if (parentSelection !== "N/A" && parentSelection !== location && parentSelection.trim() !== "") {
            const parentRow = worksheet.getRow(currentRow);
            const parentCell = parentRow.getCell(1);
            parentCell.value = `  ${parentSelection}`;
            parentCell.font = { name: 'Calibri', bold: true, italic: true };
            parentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
            parentCell.alignment = { horizontal: 'left', vertical: 'middle' };
            parentCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            
            // Fill remaining cells in parent selection row
            for (let col = 2; col <= 9; col++) {
              const cell = parentRow.getCell(col);
              cell.font = { name: 'Calibri', bold: true, italic: true };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
              cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            }
            currentRow++;
          }
          
          // Upgrade Items with exact mapping - Alternating row colors, borders, aligned
          upgrades.forEach((upgrade, upgradeIndex) => {
          const row = worksheet.getRow(currentRow);
          const isEvenRow = upgradeIndex % 2 === 0;
          const bgColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF';
          
          // Upgrade Item: Choice Title Column A - Alternating row colors, borders, left aligned
          const titleCell = row.getCell(1);
          titleCell.value = upgrade.choiceTitle;
          titleCell.font = { name: 'Calibri' };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
          titleCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          
          // Upgrade Item: Price Column I - Alternating row colors, borders, right aligned, currency format
          const priceCell = row.getCell(9);
          priceCell.value = parseInt(upgrade.clientPrice);
          priceCell.numFmt = '"$"#,##0';
          priceCell.font = { name: 'Calibri' };
          priceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          priceCell.alignment = { horizontal: 'right', vertical: 'middle' };
          priceCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          
          // Upgrade Item: Spacer Columns B-H - Empty cells with background, borders
          for (let col = 2; col <= 8; col++) {
            const cell = row.getCell(col);
            cell.font = { name: 'Calibri' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          }
          
          currentRow++;
          });
        });
      });
    });
    
    // Grand Total with styling
    const grandTotalRow = currentRow;
    const grandTotalRowIndex = grandTotalRow - 1;
    
    // Add proper column widths for professional appearance
    worksheet.columns = [
      { width: 25 }, // A - Option
      { width: 15 }, // B 
      { width: 15 }, // C
      { width: 15 }, // D
      { width: 20 }, // E - Description
      { width: 15 }, // F
      { width: 15 }, // G
      { width: 15 }, // H
      { width: 15 }  // I - Subtotal
    ];
    
    currentRow += 2; // Add space before summary section
    
    // Summary Section as per mapping
    const summaryHeaderCell = worksheet.getCell(`H${currentRow}`);
    summaryHeaderCell.value = 'SUMMARY';
    summaryHeaderCell.font = { name: 'Calibri', bold: true };
    summaryHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(`H${currentRow}:I${currentRow}`);
    
    currentRow++;
    
    // Base Price Summary
    const basePriceSummaryLabel = worksheet.getCell(`H${currentRow}`);
    basePriceSummaryLabel.value = 'Base Price:';
    basePriceSummaryLabel.font = { name: 'Calibri', bold: true };
    basePriceSummaryLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const basePriceSummaryValue = worksheet.getCell(`I${currentRow}`);
    basePriceSummaryValue.value = { formula: 'I16' };
    basePriceSummaryValue.numFmt = '"$"#,##0';
    basePriceSummaryValue.font = { name: 'Calibri' };
    basePriceSummaryValue.alignment = { horizontal: 'right', vertical: 'middle' };
    
    currentRow++;
    
    // Lot Premium Summary
    const lotPremiumSummaryLabel = worksheet.getCell(`H${currentRow}`);
    lotPremiumSummaryLabel.value = 'Lot Premium:';
    lotPremiumSummaryLabel.font = { name: 'Calibri', bold: true };
    lotPremiumSummaryLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const lotPremiumSummaryValue = worksheet.getCell(`I${currentRow}`);
    lotPremiumSummaryValue.value = { formula: 'I17' };
    lotPremiumSummaryValue.numFmt = '"$"#,##0';
    lotPremiumSummaryValue.font = { name: 'Calibri' };
    lotPremiumSummaryValue.alignment = { horizontal: 'right', vertical: 'middle' };
    
    currentRow++;
    
    // Upgrades Total Summary
    const upgradesRowEnd = currentRow - 4; // Adjust for current position
    const upgradesSummaryLabel = worksheet.getCell(`H${currentRow}`);
    upgradesSummaryLabel.value = 'Upgrades Total:';
    upgradesSummaryLabel.font = { name: 'Calibri', bold: true };
    upgradesSummaryLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const upgradesSummaryValue = worksheet.getCell(`I${currentRow}`);
    upgradesSummaryValue.value = { formula: `SUM(I20:I${upgradesRowEnd})` };
    upgradesSummaryValue.numFmt = '"$"#,##0';
    upgradesSummaryValue.font = { name: 'Calibri' };
    upgradesSummaryValue.alignment = { horizontal: 'right', vertical: 'middle' };
    
    currentRow++;
    
    // Grand Total Summary
    const grandTotalSummaryLabel = worksheet.getCell(`H${currentRow}`);
    grandTotalSummaryLabel.value = 'Grand Total:';
    grandTotalSummaryLabel.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    grandTotalSummaryLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    grandTotalSummaryLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    grandTotalSummaryLabel.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    const grandTotalSummaryValue = worksheet.getCell(`I${currentRow}`);
    grandTotalSummaryValue.value = { formula: `SUM(I${currentRow-3}:I${currentRow-1})` };
    grandTotalSummaryValue.numFmt = '"$"#,##0';
    grandTotalSummaryValue.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    grandTotalSummaryValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    grandTotalSummaryValue.alignment = { horizontal: 'right', vertical: 'middle' };
    grandTotalSummaryValue.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    currentRow += 3; // Add space before signature section
    
    // Signature Section as per mapping
    // Signature Text: Full Row - Merge cells A:I, normal text
    const signatureTextRow = worksheet.getRow(currentRow);
    const signatureTextCell = signatureTextRow.getCell(1);
    signatureTextCell.value = 'By signing below, both parties agree to the terms and total amount shown above.';
    signatureTextCell.font = { name: 'Calibri' };
    signatureTextCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    
    currentRow += 2;
    
    // Buyer Signature section
    const buyerSigRow = worksheet.getRow(currentRow);
    buyerSigRow.getCell(2).value = 'Buyer Signature:';
    buyerSigRow.getCell(2).font = { name: 'Calibri', bold: true };
    buyerSigRow.getCell(2).border = { bottom: {style:'thin'} }; // Signature line
    
    buyerSigRow.getCell(6).value = 'Date:';
    buyerSigRow.getCell(6).font = { name: 'Calibri', bold: true };
    buyerSigRow.getCell(7).border = { bottom: {style:'thin'} }; // Signature line
    
    currentRow += 2;
    
    // Company Signature section
    const companySigRow = worksheet.getRow(currentRow);
    companySigRow.getCell(2).value = 'Company Representative:';
    companySigRow.getCell(2).font = { name: 'Calibri', bold: true };
    companySigRow.getCell(2).border = { bottom: {style:'thin'} }; // Signature line
    
    companySigRow.getCell(6).value = 'Date:';
    companySigRow.getCell(6).font = { name: 'Calibri', bold: true };
    companySigRow.getCell(7).border = { bottom: {style:'thin'} }; // Signature line
    
    // Generate filename with buyer name and date
    const buyerName = formData.buyerLastName || 'Customer';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Proposal_${currentTemplate.name}_${buyerName}_${dateStr}.xlsx`;
    
    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Excel Export Complete",
      description: "Proposal exported following exact template cell mapping with proper formatting, merged cells, borders, fonts, summary, and signatures.",
    });
    
    toast({
      title: "Excel Export Complete",
      description: "Proposal exported with template format and preserved formulas.",
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
                              <SelectItem value="sorrento">Sorrento</SelectItem>
                              <SelectItem value="ravello">Ravello</SelectItem>
                              <SelectItem value="verona">Verona</SelectItem>
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

                      {/* Sales Incentive */}
                      <Card className="mb-4 bg-white border-gray-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-md font-medium text-gray-900">Sales Incentive</h4>
                              <p className="text-sm text-gray-600">Promotional discount or credit</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="sales-incentive" className="text-sm font-medium text-gray-700">Amount $</Label>
                              <Input
                                id="sales-incentive"
                                type="text"
                                className="w-32"
                                placeholder="0"
                                value={formatNumberWithCommas(formData.salesIncentive)}
                                onChange={(e) => {
                                  handleNumberInputChange(e.target.value, (value) => {
                                    setFormData({ ...formData, salesIncentive: value });
                                    setSalesIncentiveEnabled(value !== "0" && value !== "");
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

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
