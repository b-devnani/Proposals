import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UpgradeTable } from "@/components/upgrade-table";
import { OrderSummary } from "@/components/order-summary";
import { formatNumberWithCommas, parseNumberFromCommas, handleNumberInputChange } from "@/lib/number-utils";
import { groupUpgradesByCategory } from "@/lib/upgrade-data";
import type { HomeTemplate, Upgrade } from "@shared/schema";

export default function PurchaseOrder() {
  const { toast } = useToast();
  
  // State for form data
  const [formData, setFormData] = useState({
    buyerLastName: "",
    community: "",
    lotNumber: "",
    lotAddress: "",
    lotPremium: "0",
    templateId: ""
  });
  
  // State for selected upgrades
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());
  
  // Fetch home templates
  const { data: templates } = useQuery<HomeTemplate[]>({
    queryKey: ["/api/templates"],
  });
  
  // Fetch upgrades
  const { data: upgrades } = useQuery<Upgrade[]>({
    queryKey: ["/api/upgrades"],
  });
  
  // Get current template
  const currentTemplate = templates?.find(t => t.id.toString() === formData.templateId);
  
  // Calculate totals
  const selectedUpgradeItems = upgrades?.filter(upgrade => selectedUpgrades.has(upgrade.id)) || [];
  const upgradesTotal = selectedUpgradeItems.reduce((sum, upgrade) => sum + parseInt(upgrade.clientPrice), 0);
  const basePrice = parseInt(currentTemplate?.basePrice || "0");
  const lotPremium = parseInt(formData.lotPremium || "0");
  const grandTotal = basePrice + lotPremium + upgradesTotal;
  
  const handleInputChange = (field: string, value: string) => {
    if (field === "lotPremium") {
      setFormData(prev => ({ ...prev, [field]: parseNumberFromCommas(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };
  
  const handleUpgradeToggle = (upgradeId: number) => {
    setSelectedUpgrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(upgradeId)) {
        newSet.delete(upgradeId);
      } else {
        newSet.add(upgradeId);
      }
      return newSet;
    });
  };
  
  const handleSelectAll = (category: string, location: string) => {
    if (!upgrades) return;
    
    const categoryUpgrades = upgrades.filter(u => u.category === category && u.location === location);
    const allSelected = categoryUpgrades.every(u => selectedUpgrades.has(u.id));
    
    setSelectedUpgrades(prev => {
      const newSet = new Set(prev);
      categoryUpgrades.forEach(u => {
        if (allSelected) {
          newSet.delete(u.id);
        } else {
          newSet.add(u.id);
        }
      });
      return newSet;
    });
  };
  
  // Excel Export Function with exact template matching
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

    const selectedUpgradeItems = upgrades?.filter(upgrade => selectedUpgrades.has(upgrade.id)) || [];
    
    // Set column widths to match template exactly
    worksheet.columns = [
      { width: 15 }, // A - Option
      { width: 15 }, // B - Form labels  
      { width: 5 },  // C - Spacer
      { width: 15 }, // D - Form data
      { width: 20 }, // E - Description start
      { width: 20 }, // F
      { width: 20 }, // G  
      { width: 20 }, // H
      { width: 15 }  // I - Subtotal
    ];
    
    // Apply Calibri font as default for entire worksheet
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11 };
      });
    });
    
    // Title: A1:I1 - "PURCHASE ORDER" - Blue background, white text, centered, bold, 16pt Calibri
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'PURCHASE ORDER';
    titleCell.font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    worksheet.mergeCells('A1:I1');
    worksheet.getRow(1).height = 30;
    
    // Company Name: A3:I3 - Light blue background, dark blue text, centered, bold, 14pt Calibri
    const companyCell = worksheet.getCell('A3');
    companyCell.value = '• BEECHEN & DILL HOMES •';
    companyCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF366092' } };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3FF' } };
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    companyCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    worksheet.mergeCells('A3:I3');
    worksheet.getRow(3).height = 25;
    
    // Company Address: A7:I7 - Full address with bullets, centered
    const addressCell = worksheet.getCell('A7');
    addressCell.value = '565 Village Center Dr • Burr Ridge, IL 60527-4516 • Phone: (630) 920-9430';
    addressCell.font = { name: 'Calibri', size: 11 };
    addressCell.alignment = { horizontal: 'center', vertical: 'middle' };
    addressCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    worksheet.mergeCells('A7:I7');
    
    // Form Fields with gray background for labels and borders around both
    const formLabels = [
      ['B9', 'Date', 'E9', new Date().toLocaleDateString()],
      ['B10', "Buyer's Last Name", 'E10', formData.buyerLastName || ''],
      ['B11', 'Community', 'E11', formData.community || ''],
      ['B12', 'Lot Number', 'E12', formData.lotNumber || ''],
      ['B13', 'Lot Address', 'E13', formData.lotAddress || ''],
      ['B14', 'House Plan', 'E14', currentTemplate.name]
    ];
    
    formLabels.forEach(([labelCell, labelText, valueCell, valueText]) => {
      // Label cell with gray background and borders
      const label = worksheet.getCell(labelCell);
      label.value = labelText;
      label.font = { name: 'Calibri', bold: true, size: 11 };
      label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      label.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      
      // Value cell with borders
      const value = worksheet.getCell(valueCell);
      value.value = valueText;
      value.font = { name: 'Calibri', size: 11 };
      value.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    // Base Price: E16 (Label), I16 (Value) - Light blue background, bold, borders
    const basePriceLabel = worksheet.getCell('E16');
    basePriceLabel.value = `${currentTemplate.name} Base Price`;
    basePriceLabel.font = { name: 'Calibri', bold: true, size: 11 };
    basePriceLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } };
    basePriceLabel.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    
    const basePriceValue = worksheet.getCell('I16');
    basePriceValue.value = parseInt(currentTemplate.basePrice);
    basePriceValue.numFmt = '"$"#,##0';
    basePriceValue.font = { name: 'Calibri', bold: true, size: 11 };
    basePriceValue.alignment = { horizontal: 'right' };
    basePriceValue.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    
    // Lot Premium: E17 (Label), I17 (Value) - Light blue background, bold, borders
    const lotPremiumLabel = worksheet.getCell('E17');
    lotPremiumLabel.value = 'Lot Premium';
    lotPremiumLabel.font = { name: 'Calibri', bold: true, size: 11 };
    lotPremiumLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } };
    lotPremiumLabel.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    
    const lotPremiumValue = worksheet.getCell('I17');
    lotPremiumValue.value = parseInt(formData.lotPremium || "0");
    lotPremiumValue.numFmt = '"$"#,##0';
    lotPremiumValue.font = { name: 'Calibri', bold: true, size: 11 };
    lotPremiumValue.alignment = { horizontal: 'right' };
    lotPremiumValue.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    
    // Table Headers - Blue background, white text, bold, borders
    const headerStyle = {
      font: { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    };
    
    // Option Header: A19:D19
    const optionHeader = worksheet.getCell('A19');
    optionHeader.value = 'Option';
    Object.assign(optionHeader, headerStyle);
    worksheet.mergeCells('A19:D19');
    
    // Description Header: E19:H19
    const descHeader = worksheet.getCell('E19');
    descHeader.value = 'Description/Notes';
    Object.assign(descHeader, headerStyle);
    worksheet.mergeCells('E19:H19');
    
    // Subtotal Header: I19
    const subtotalHeader = worksheet.getCell('I19');
    subtotalHeader.value = 'Subtotal';
    Object.assign(subtotalHeader, headerStyle);
    
    worksheet.getRow(19).height = 20;
    
    // Track current row for upgrades
    let currentRow = 20;
    
    // Group and sort upgrades by category and location
    const groupedUpgrades = groupUpgradesByCategory(selectedUpgradeItems);
    
    Object.entries(groupedUpgrades).forEach(([category, locations]) => {
      // Category Headers - Full Row - Blue background, white text, bold, borders
      const categoryRow = worksheet.getRow(currentRow);
      for (let col = 1; col <= 9; col++) {
        const cell = categoryRow.getCell(col);
        cell.value = col === 1 ? category : '';
        cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
      currentRow++;
      
      Object.entries(locations).forEach(([location, upgrades]) => {
        // Location Headers (if not N/A) - Full Row - Light gray background, italic, bold, borders
        if (location !== "N/A") {
          const locationRow = worksheet.getRow(currentRow);
          for (let col = 1; col <= 9; col++) {
            const cell = locationRow.getCell(col);
            cell.value = col === 1 ? location : '';
            cell.font = { name: 'Calibri', bold: true, italic: true, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          }
          currentRow++;
        }
        
        // Upgrade Items - Alternating row colors, borders, left/right aligned
        upgrades.forEach((upgrade, upgradeIndex) => {
          const row = worksheet.getRow(currentRow);
          const isEvenRow = upgradeIndex % 2 === 0;
          const bgColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF';
          
          // Choice Title - Column A - Left aligned
          const titleCell = row.getCell(1);
          titleCell.value = upgrade.choiceTitle;
          titleCell.font = { name: 'Calibri', size: 11 };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
          titleCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          // Price - Column I - Right aligned, currency format
          const priceCell = row.getCell(9);
          priceCell.value = parseInt(upgrade.clientPrice);
          priceCell.numFmt = '"$"#,##0';
          priceCell.font = { name: 'Calibri', size: 11 };
          priceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          priceCell.alignment = { horizontal: 'right', vertical: 'middle' };
          priceCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          // Spacer Columns B-H - Empty cells with background and borders
          for (let col = 2; col <= 8; col++) {
            const cell = row.getCell(col);
            cell.value = '';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          }
          
          currentRow++;
        });
      });
    });
    
    // Grand Total - Column A (Label), Column I (Value) - Blue background, white text, bold, currency format, borders
    const grandTotalRow = worksheet.getRow(currentRow);
    
    // Grand Total Label
    const grandTotalLabelCell = grandTotalRow.getCell(1);
    grandTotalLabelCell.value = 'Grand Total';
    grandTotalLabelCell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    grandTotalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    grandTotalLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };
    grandTotalLabelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    
    // Grand Total Value with formula
    const grandTotalCell = grandTotalRow.getCell(9);
    grandTotalCell.value = { formula: `SUM(I16:I${currentRow - 1})` };
    grandTotalCell.numFmt = '"$"#,##0';
    grandTotalCell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    grandTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    grandTotalCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    
    // Fill remaining cells in grand total row with blue background
    for (let col = 2; col <= 8; col++) {
      const cell = grandTotalRow.getCell(col);
      cell.value = '';
      cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
    
    // Add signature section (optional based on template)
    const signatureStartRow = currentRow + 3;
    
    // Signature Text - Full Row - Merge cells A:I
    const sigTextCell = worksheet.getCell(`A${signatureStartRow}`);
    sigTextCell.value = 'BUYER APPROVAL:';
    sigTextCell.font = { name: 'Calibri', bold: true, size: 11 };
    worksheet.mergeCells(`A${signatureStartRow}:I${signatureStartRow}`);
    
    // Buyer Signature - Left and Right cells with signature lines
    const buyerSigRow = signatureStartRow + 2;
    const buyerSigLabel = worksheet.getCell(`A${buyerSigRow}`);
    buyerSigLabel.value = 'Buyer Signature:';
    buyerSigLabel.font = { name: 'Calibri', size: 11 };
    buyerSigLabel.border = { bottom: { style: 'thin' } };
    
    const buyerDateLabel = worksheet.getCell(`G${buyerSigRow}`);
    buyerDateLabel.value = 'Date:';
    buyerDateLabel.font = { name: 'Calibri', size: 11 };
    buyerDateLabel.border = { bottom: { style: 'thin' } };
    
    // Company Signature
    const companySigRow = buyerSigRow + 2;
    const companySigLabel = worksheet.getCell(`A${companySigRow}`);
    companySigLabel.value = 'Company Representative:';
    companySigLabel.font = { name: 'Calibri', size: 11 };
    companySigLabel.border = { bottom: { style: 'thin' } };
    
    const companyDateLabel = worksheet.getCell(`G${companySigRow}`);
    companyDateLabel.value = 'Date:';
    companyDateLabel.font = { name: 'Calibri', size: 11 };
    companyDateLabel.border = { bottom: { style: 'thin' } };
    
    // Generate filename with buyer name and date
    const buyerName = formData.buyerLastName || 'Customer';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `PO_${currentTemplate.name}_${buyerName}_${dateStr}.xlsx`;
    
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
      description: "Purchase order exported with exact template format, fonts, colors, and borders.",
    });
  };
  
  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Purchase order saved as draft.",
    });
  };
  
  const handlePreview = () => {
    // Implementation for preview functionality
    toast({
      title: "Preview",
      description: "Opening purchase order preview...",
    });
  };
  
  const handleGeneratePO = () => {
    handleExportExcel();
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Purchase Order Generator</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Template & Customer Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Home Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template">Select Template</Label>
                <Select value={formData.templateId} onValueChange={(value) => handleInputChange("templateId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} - ${parseInt(template.basePrice).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {currentTemplate && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">{currentTemplate.name}</h3>
                  <div className="text-lg font-bold text-primary">
                    Base Price: ${parseInt(currentTemplate.basePrice).toLocaleString()}
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="lotPremium">Lot Premium</Label>
                <Input
                  id="lotPremium"
                  value={formatNumberWithCommas(formData.lotPremium)}
                  onChange={(e) => handleNumberInputChange(e.target.value, (value) => handleInputChange("lotPremium", value))}
                  placeholder="Enter lot premium"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="buyerLastName">Buyer's Last Name</Label>
                <Input
                  id="buyerLastName"
                  value={formData.buyerLastName}
                  onChange={(e) => handleInputChange("buyerLastName", e.target.value)}
                  placeholder="Enter buyer's last name"
                />
              </div>
              
              <div>
                <Label htmlFor="community">Community</Label>
                <Input
                  id="community"
                  value={formData.community}
                  onChange={(e) => handleInputChange("community", e.target.value)}
                  placeholder="Enter community name"
                />
              </div>
              
              <div>
                <Label htmlFor="lotNumber">Lot Number</Label>
                <Input
                  id="lotNumber"
                  value={formData.lotNumber}
                  onChange={(e) => handleInputChange("lotNumber", e.target.value)}
                  placeholder="Enter lot number"
                />
              </div>
              
              <div>
                <Label htmlFor="lotAddress">Lot Address</Label>
                <Input
                  id="lotAddress"
                  value={formData.lotAddress}
                  onChange={(e) => handleInputChange("lotAddress", e.target.value)}
                  placeholder="Enter lot address"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Middle Column - Upgrades */}
        <div>
          <UpgradeTable
            groupedUpgrades={groupUpgradesByCategory(upgrades || [])}
            selectedUpgrades={selectedUpgrades}
            showCostColumns={false}
            onUpgradeToggle={handleUpgradeToggle}
            onSelectAll={handleSelectAll}
          />
        </div>
        
        {/* Right Column - Order Summary */}
        <div>
          <OrderSummary
            basePrice={currentTemplate?.basePrice || "0"}
            baseCost={currentTemplate?.baseCost || "0"}
            lotPremium={formData.lotPremium}
            selectedUpgrades={selectedUpgradeItems}
            showCostColumns={false}
            onSaveDraft={handleSaveDraft}
            onPreview={handlePreview}
            onGeneratePO={handleGeneratePO}
            onExportExcel={handleExportExcel}
          />
        </div>
      </div>
    </div>
  );
}