import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UpgradeTable } from "@/components/upgrade-table";
import { OrderSummary } from "@/components/order-summary";
import { formatNumberWithCommas, parseNumberFromCommas, handleNumberInputChange } from "@/lib/number-utils";
import { groupUpgradesByCategory } from "@/lib/upgrade-data";
import type { HomeTemplate, Upgrade } from "@shared/schema";

interface FormData {
  buyerLastName: string;
  community: string;
  lotNumber: string;
  lotAddress: string;
  lotPremium: string;
  baseCost: string;
}

export default function PurchaseOrder() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<FormData>({
    buyerLastName: "",
    community: "",
    lotNumber: "",
    lotAddress: "",
    lotPremium: "0",
    baseCost: "0",
  });

  const { data: templates } = useQuery<HomeTemplate[]>({
    queryKey: ['/api/templates'],
  });

  const { data: upgrades } = useQuery<Upgrade[]>({
    queryKey: ['/api/upgrades'],
  });

  const currentTemplate = templates?.find(t => t.id === selectedTemplate);

  const selectedUpgradeItems = upgrades?.filter(upgrade => selectedUpgrades.has(upgrade.id)) || [];
  
  const groupedUpgrades = groupUpgradesByCategory(upgrades || []);

  const handleTemplateChange = (templateId: string) => {
    const id = parseInt(templateId);
    setSelectedTemplate(id);
    const template = templates?.find(t => t.id === id);
    if (template) {
      setFormData(prev => ({
        ...prev,
        baseCost: template.basePrice
      }));
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
    const categoryUpgrades = groupedUpgrades[category]?.[location] || [];
    const upgradeIds = categoryUpgrades.map(u => u.id);
    
    setSelectedUpgrades(prev => {
      const newSet = new Set(prev);
      const allSelected = upgradeIds.every(id => newSet.has(id));
      
      if (allSelected) {
        upgradeIds.forEach(id => newSet.delete(id));
      } else {
        upgradeIds.forEach(id => newSet.add(id));
      }
      
      return newSet;
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

    try {
      // Use ExcelJS for proper styling support  
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Order Summary');

      const selectedUpgradeItems = upgrades?.filter(upgrade => selectedUpgrades.has(upgrade.id)) || [];
      
      // Set column widths to match exact template
      worksheet.columns = [
        { width: 12 }, // A 
        { width: 12 }, // B 
        { width: 8 },  // C 
        { width: 12 }, // D 
        { width: 18 }, // E 
        { width: 18 }, // F
        { width: 18 }, // G  
        { width: 18 }, // H
        { width: 15 }  // I 
      ];
      
      // Title - Row 1, merged A1:I1 with blue background
      worksheet.mergeCells('A1:I1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'PURCHASE ORDER';
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 25;
      
      // Empty row 2
      worksheet.getRow(2).height = 8;
      
      // Company header - Row 3, merged A3:I3
      worksheet.mergeCells('A3:I3');
      const companyCell = worksheet.getCell('A3');
      companyCell.value = '• BEECHEN & DILL HOMES •';
      companyCell.font = { bold: true, size: 14, color: { argb: 'FF366092' } };
      companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3FF' } };
      companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(3).height = 20;
      
      // Empty rows 4-6
      worksheet.getRow(4).height = 8;
      worksheet.getRow(5).height = 8;
      worksheet.getRow(6).height = 8;
      
      // Address line - Row 7, merged sections
      worksheet.mergeCells('A7:B7');
      worksheet.getCell('A7').value = '565 Village Center Dr';
      worksheet.mergeCells('D7:F7'); 
      worksheet.getCell('D7').value = 'Burr Ridge, IL 60527-4516';
      worksheet.getCell('C7').value = '•';
      worksheet.getCell('G7').value = '•';
      worksheet.getCell('H7').value = 'Phone: (630) 920-9430';
      worksheet.getRow(7).height = 15;
      
      // Empty row 8
      worksheet.getRow(8).height = 8;

      // Form data section with exact template positioning (rows 9-14)
      // Row 9: Date - merged E9:I9
      worksheet.getCell('B9').value = 'Date';
      worksheet.getCell('B9').font = { bold: true };
      worksheet.getCell('B9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      worksheet.mergeCells('E9:I9');
      worksheet.getCell('E9').value = new Date().toLocaleDateString();
      worksheet.getRow(9).height = 15;
      
      // Row 10: Buyer's Last Name - merged E10:I10  
      worksheet.getCell('B10').value = "Buyer's Last Name";
      worksheet.getCell('B10').font = { bold: true };
      worksheet.getCell('B10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      worksheet.mergeCells('E10:I10');
      worksheet.getCell('E10').value = formData.buyerLastName || '';
      worksheet.getRow(10).height = 15;
      
      // Row 11: Community - merged E11:I11
      worksheet.getCell('B11').value = 'Community';
      worksheet.getCell('B11').font = { bold: true };
      worksheet.getCell('B11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      worksheet.mergeCells('E11:I11');
      worksheet.getCell('E11').value = formData.community || '';
      worksheet.getRow(11).height = 15;
      
      // Row 12: Lot Number - merged E12:I12
      worksheet.getCell('B12').value = 'Lot Number';
      worksheet.getCell('B12').font = { bold: true };
      worksheet.getCell('B12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      worksheet.mergeCells('E12:I12');
      worksheet.getCell('E12').value = formData.lotNumber || '';
      worksheet.getRow(12).height = 15;
      
      // Row 13: Lot Address - merged E13:I13
      worksheet.getCell('B13').value = 'Lot Address';
      worksheet.getCell('B13').font = { bold: true };
      worksheet.getCell('B13').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      worksheet.mergeCells('E13:I13');
      worksheet.getCell('E13').value = formData.lotAddress || '';
      worksheet.getRow(13).height = 15;
      
      // Row 14: House Plan - merged E14:I14
      worksheet.getCell('B14').value = 'House Plan';
      worksheet.getCell('B14').font = { bold: true };
      worksheet.getCell('B14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      worksheet.mergeCells('E14:I14');
      worksheet.getCell('E14').value = currentTemplate.name;
      worksheet.getRow(14).height = 15;
      
      // Empty row 15
      worksheet.getRow(15).height = 8;
      
      // Start pricing section at row 16
      let currentRow = 16;
      
      // Base template pricing
      worksheet.getCell(`A${currentRow}`).value = 'Base Price';
      worksheet.getCell(`I${currentRow}`).value = parseInt(currentTemplate.basePrice);
      worksheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0';
      currentRow++;
      
      // Lot premium if exists
      if (formData.lotPremium && formData.lotPremium !== '0') {
        worksheet.getCell(`A${currentRow}`).value = 'Lot Premium';
        worksheet.getCell(`I${currentRow}`).value = parseInt(formData.lotPremium);
        worksheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0';
        currentRow++;
      }
      
      // Headers row for upgrades (at row 19 to match template)
      currentRow = 19;
      worksheet.mergeCells('A19:D19');
      worksheet.getCell('A19').value = 'Option';
      worksheet.mergeCells('E19:H19');
      worksheet.getCell('E19').value = 'Description';
      worksheet.getCell('I19').value = 'Subtotal';
      
      // Style headers with blue background
      ['A19', 'E19', 'I19'].forEach(cell => {
        const headerCell = worksheet.getCell(cell);
        headerCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      worksheet.getRow(19).height = 20;
      
      // Set current row to start upgrades data at row 20
      currentRow = 20;
      
      // Group and sort upgrades by category and location
      const groupedUpgrades = groupUpgradesByCategory(selectedUpgradeItems);
      
      Object.entries(groupedUpgrades).forEach(([category, locations]) => {
        // Category header with blue background
        const categoryRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
        categoryRow.getCell(1).value = category;
        
        for (let col = 1; col <= 9; col++) {
          const cell = categoryRow.getCell(col);
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        currentRow++;
        
        Object.entries(locations).forEach(([location, upgrades]) => {
          // Location header (if not N/A)
          if (location !== "N/A") {
            const locationRow = worksheet.getRow(currentRow);
            worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
            locationRow.getCell(1).value = location;
            
            for (let col = 1; col <= 9; col++) {
              const cell = locationRow.getCell(col);
              cell.font = { bold: true, italic: true };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
            currentRow++;
          }
          
          // Add upgrade items with alternating colors
          upgrades.forEach((upgrade, upgradeIndex) => {
            const row = worksheet.getRow(currentRow);
            const isEvenRow = upgradeIndex % 2 === 0;
            const bgColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF';
            
            // Choice title (merged A:D)
            worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
            const titleCell = row.getCell(1);
            titleCell.value = upgrade.choiceTitle;
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
            
            // Description (merged E:H) - empty for now
            worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
            const descCell = row.getCell(5);
            descCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            
            // Price value (column I)
            const priceCell = row.getCell(9);
            priceCell.value = parseInt(upgrade.clientPrice);
            priceCell.numFmt = '"$"#,##0';
            priceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            priceCell.alignment = { horizontal: 'right', vertical: 'middle' };
            
            currentRow++;
          });
        });
      });
      
      // Grand Total with blue background
      const grandTotalRow = worksheet.getRow(currentRow);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      grandTotalRow.getCell(1).value = 'Grand Total';
      
      // Formula for grand total
      const grandTotalCell = grandTotalRow.getCell(9);
      grandTotalCell.value = { formula: `SUM(I16:I${currentRow - 1})` };
      grandTotalCell.numFmt = '"$"#,##0';
      
      for (let col = 1; col <= 9; col++) {
        const cell = grandTotalRow.getCell(col);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
        cell.alignment = { horizontal: col === 9 ? 'right' : 'left', vertical: 'middle' };
      }
      
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
        description: "Purchase order exported with professional formatting and exact template structure.",
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting to Excel.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Purchase Order Generator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Home Template Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template">Select Template</Label>
                  <Select onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a home template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name} - ${formatNumberWithCommas(template.basePrice)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyerLastName">Buyer's Last Name</Label>
                  <Input
                    id="buyerLastName"
                    value={formData.buyerLastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, buyerLastName: e.target.value }))}
                    placeholder="Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="community">Community</Label>
                  <Input
                    id="community"
                    value={formData.community}
                    onChange={(e) => setFormData(prev => ({ ...prev, community: e.target.value }))}
                    placeholder="Heritage Hills"
                  />
                </div>
                <div>
                  <Label htmlFor="lotNumber">Lot Number</Label>
                  <Input
                    id="lotNumber"
                    value={formData.lotNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, lotNumber: e.target.value }))}
                    placeholder="123"
                  />
                </div>
                <div>
                  <Label htmlFor="lotAddress">Lot Address</Label>
                  <Input
                    id="lotAddress"
                    value={formData.lotAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, lotAddress: e.target.value }))}
                    placeholder="123 Main Street"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing Adjustments */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing Adjustments</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lotPremium">Lot Premium</Label>
                  <Input
                    id="lotPremium"
                    value={formatNumberWithCommas(formData.lotPremium)}
                    onChange={(e) => handleNumberInputChange(e, (value) => 
                      setFormData(prev => ({ ...prev, lotPremium: value }))
                    )}
                    placeholder="$0"
                  />
                </div>
                <div>
                  <Label htmlFor="baseCost">Base Cost</Label>
                  <Input
                    id="baseCost"
                    value={formatNumberWithCommas(formData.baseCost)}
                    onChange={(e) => handleNumberInputChange(e, (value) => 
                      setFormData(prev => ({ ...prev, baseCost: value }))
                    )}
                    placeholder="$0"
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Upgrades Section */}
            <Card>
              <CardHeader>
                <CardTitle>Available Upgrades</CardTitle>
              </CardHeader>
              <CardContent>
                <UpgradeTable
                  groupedUpgrades={groupedUpgrades}
                  selectedUpgrades={selectedUpgrades}
                  showCostColumns={false}
                  onUpgradeToggle={handleUpgradeToggle}
                  onSelectAll={handleSelectAll}
                />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              basePrice={currentTemplate?.basePrice || "0"}
              baseCost={formData.baseCost}
              lotPremium={formData.lotPremium}
              selectedUpgrades={selectedUpgradeItems}
              showCostColumns={false}
              onSaveDraft={() => {}}
              onPreview={() => {}}
              onGeneratePO={() => {}}
              onExportExcel={handleExportExcel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}