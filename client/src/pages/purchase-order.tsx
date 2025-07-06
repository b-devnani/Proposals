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
import autoTable from 'jspdf-autotable';
import logoPath from "@assets/logo-fullColor (1)_1751758486563.png";
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
    if (!currentTemplate) {
      toast({
        title: "Export Failed",
        description: "Please select a template.",
        variant: "destructive"
      });
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    const selectedUpgradeItems = upgrades?.filter(upgrade => selectedUpgrades.has(upgrade.id)) || [];
    
    // Create workbook with template structure
    const ws: any = {};
    
    // Set up the exact template structure
    ws['A1'] = { v: 'PURCHASE ORDER', t: 's' };
    
    // Add company info with logo placeholder
    ws['A3'] = { v: '• BEECHEN & DILL HOMES •', t: 's' };
    ws['A7'] = { v: '565 Village Center Dr', t: 's' };
    ws['C7'] = { v: '•', t: 's' };
    ws['D7'] = { v: 'Burr Ridge, IL 60527-4516', t: 's' };
    ws['G7'] = { v: '•', t: 's' };
    ws['H7'] = { v: 'Phone: (630) 920-9430', t: 's' };
    
    // Form data section
    ws['B9'] = { v: 'Date', t: 's' };
    ws['E9'] = { v: new Date().toLocaleDateString(), t: 's' };
    ws['B10'] = { v: "Buyer's Last Name", t: 's' };
    ws['E10'] = { v: formData.buyerLastName || '', t: 's' };
    ws['B11'] = { v: 'Community', t: 's' };
    ws['E11'] = { v: formData.community || '', t: 's' };
    ws['B12'] = { v: 'Lot Number', t: 's' };
    ws['E12'] = { v: formData.lotNumber || '', t: 's' };
    ws['B13'] = { v: 'Lot Address', t: 's' };
    ws['E13'] = { v: formData.lotAddress || '', t: 's' };
    ws['B14'] = { v: 'House Plan', t: 's' };
    ws['E14'] = { v: currentTemplate.name, t: 's' };
    
    // Base pricing
    ws['E16'] = { v: `${currentTemplate.name} Base Price`, t: 's' };
    ws['I16'] = { v: parseInt(currentTemplate.basePrice), t: 'n' };
    ws['E17'] = { v: 'Lot Premium', t: 's' };
    ws['I17'] = { v: parseInt(formData.lotPremium || "0"), t: 'n' };
    
    // Headers
    ws['A19'] = { v: 'Option', t: 's' };
    ws['E19'] = { v: 'Description/Notes', t: 's' };
    ws['I19'] = { v: 'Subtotal', t: 's' };
    
    let currentRow = 20;
    
    // Group and sort upgrades by category and location
    const groupedUpgrades = groupUpgradesByCategory(selectedUpgradeItems);
    
    Object.entries(groupedUpgrades).forEach(([category, locations]) => {
      // Category header with full row styling
      const categoryRowIndex = currentRow - 1;
      ws[XLSX.utils.encode_cell({ r: categoryRowIndex, c: 0 })] = { v: category, t: 's' };
      
      // Apply category header styling across the entire row
      for (let col = 0; col < 9; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: categoryRowIndex, c: col });
        if (!ws[cellAddr]) ws[cellAddr] = { v: '', t: 's' };
        
        ws[cellAddr].s = {
          font: { sz: 12, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "left", vertical: "center" },
          fill: { fgColor: { rgb: "495057" } },
          border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "medium", color: { rgb: "000000" } },
            right: { style: "medium", color: { rgb: "000000" } }
          }
        };
      }
      currentRow++;
      
      Object.entries(locations).forEach(([location, upgrades]) => {
        // Location header (if not N/A)
        if (location !== "N/A") {
          const locationRowIndex = currentRow - 1;
          ws[XLSX.utils.encode_cell({ r: locationRowIndex, c: 0 })] = { v: location, t: 's' };
          
          // Apply location header styling across the row
          for (let col = 0; col < 9; col++) {
            const cellAddr = XLSX.utils.encode_cell({ r: locationRowIndex, c: col });
            if (!ws[cellAddr]) ws[cellAddr] = { v: '', t: 's' };
            
            ws[cellAddr].s = {
              font: { sz: 11, bold: true, italic: true },
              alignment: { horizontal: "left", vertical: "center" },
              fill: { fgColor: { rgb: "E9ECEF" } },
              border: {
                top: { style: "thin", color: { rgb: "ADB5BD" } },
                bottom: { style: "thin", color: { rgb: "ADB5BD" } },
                left: { style: "thin", color: { rgb: "ADB5BD" } },
                right: { style: "thin", color: { rgb: "ADB5BD" } }
              }
            };
          }
          currentRow++;
        }
        
        // Add upgrade items with professional formatting
        upgrades.forEach((upgrade, upgradeIndex) => {
          const rowIndex = currentRow - 1;
          const isEvenRow = upgradeIndex % 2 === 0;
          
          // Choice title with full row styling
          ws[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })] = { 
            v: upgrade.choiceTitle, 
            t: 's'
          };
          
          // Price value
          ws[XLSX.utils.encode_cell({ r: rowIndex, c: 8 })] = { 
            v: parseInt(upgrade.clientPrice), 
            t: 'n'
          };
          
          // Apply formatting to entire row (A through I)
          for (let col = 0; col < 9; col++) {
            const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: col });
            if (!ws[cellAddr]) ws[cellAddr] = { v: '', t: 's' };
            
            ws[cellAddr].s = {
              font: { sz: 10 },
              alignment: { 
                horizontal: col === 8 ? "right" : "left", 
                vertical: "center" 
              },
              fill: { fgColor: { rgb: isEvenRow ? "F8F9FA" : "FFFFFF" } },
              border: {
                top: { style: "thin", color: { rgb: "DEE2E6" } },
                bottom: { style: "thin", color: { rgb: "DEE2E6" } },
                left: { style: "thin", color: { rgb: "DEE2E6" } },
                right: { style: "thin", color: { rgb: "DEE2E6" } }
              }
            };
            
            // Price formatting for column I
            if (col === 8 && ws[cellAddr].t === 'n') {
              ws[cellAddr].s.numFmt = '"$"#,##0';
              ws[cellAddr].s.font.bold = false;
            }
          }
          
          currentRow++;
        });
      });
    });
    
    // Grand Total with formula and full row styling
    const grandTotalRow = currentRow;
    const grandTotalRowIndex = grandTotalRow - 1;
    
    ws[XLSX.utils.encode_cell({ r: grandTotalRowIndex, c: 0 })] = { v: 'Grand Total', t: 's' };
    ws[XLSX.utils.encode_cell({ r: grandTotalRowIndex, c: 8 })] = { 
      f: `SUM(I16:I${grandTotalRow - 1})`, 
      t: 'n' 
    };
    
    // Apply Grand Total styling across the entire row
    for (let col = 0; col < 9; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: grandTotalRowIndex, c: col });
      if (!ws[cellAddr]) ws[cellAddr] = { v: '', t: 's' };
      
      ws[cellAddr].s = {
        font: { 
          sz: 14, 
          bold: true, 
          color: { rgb: "FFFFFF" } 
        },
        alignment: { 
          horizontal: col === 8 ? "right" : "left", 
          vertical: "center" 
        },
        fill: { fgColor: { rgb: "1F4E79" } },
        border: {
          top: { style: "thick", color: { rgb: "000000" } },
          bottom: { style: "thick", color: { rgb: "000000" } },
          left: { style: "thick", color: { rgb: "000000" } },
          right: { style: "thick", color: { rgb: "000000" } }
        }
      };
      
      // Special formatting for the price cell
      if (col === 8) {
        ws[cellAddr].s.numFmt = '"$"#,##0';
      }
    };
    
    // Summary section with formulas
    const summaryStartRow = grandTotalRow + 2;
    ws[XLSX.utils.encode_cell({ r: summaryStartRow, c: 8 })] = { v: 'SUMMARY:', t: 's' };
    
    ws[XLSX.utils.encode_cell({ r: summaryStartRow + 1, c: 7 })] = { v: 'Base Price:', t: 's' };
    ws[XLSX.utils.encode_cell({ r: summaryStartRow + 1, c: 8 })] = { f: 'I16', t: 'n' };
    
    ws[XLSX.utils.encode_cell({ r: summaryStartRow + 2, c: 7 })] = { v: 'Lot Premium:', t: 's' };
    ws[XLSX.utils.encode_cell({ r: summaryStartRow + 2, c: 8 })] = { f: 'I17', t: 'n' };
    
    ws[XLSX.utils.encode_cell({ r: summaryStartRow + 3, c: 7 })] = { v: 'Upgrades Total:', t: 's' };
    ws[XLSX.utils.encode_cell({ r: summaryStartRow + 3, c: 8 })] = { 
      f: `SUM(I20:I${grandTotalRow - 1})`, 
      t: 'n' 
    };
    
    ws[XLSX.utils.encode_cell({ r: summaryStartRow + 4, c: 7 })] = { v: 'Grand Total:', t: 's' };
    ws[XLSX.utils.encode_cell({ r: summaryStartRow + 4, c: 8 })] = { 
      f: `SUM(I${summaryStartRow + 2}:I${summaryStartRow + 4})`, 
      t: 'n' 
    };
    
    // Signature section
    const sigStartRow = summaryStartRow + 6;
    ws[XLSX.utils.encode_cell({ r: sigStartRow, c: 0 })] = { 
      v: 'By signing below, both parties acknowledge and agree to the terms and conditions outlined in this Purchase Order.', 
      t: 's' 
    };
    
    ws[XLSX.utils.encode_cell({ r: sigStartRow + 3, c: 0 })] = { v: 'Buyer Signature:', t: 's' };
    ws[XLSX.utils.encode_cell({ r: sigStartRow + 3, c: 7 })] = { v: 'Date:', t: 's' };
    
    ws[XLSX.utils.encode_cell({ r: sigStartRow + 7, c: 0 })] = { v: 'Beechen & Dill Homes Representative:', t: 's' };
    ws[XLSX.utils.encode_cell({ r: sigStartRow + 7, c: 7 })] = { v: 'Date:', t: 's' };
    
    // Set worksheet range
    ws['!ref'] = `A1:I${sigStartRow + 8}`;
    
    // Add merged cells for proper formatting
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // Company name
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } }, // Address
      { s: { r: 6, c: 3 }, e: { r: 6, c: 5 } }, // Address continued
      { s: { r: 8, c: 4 }, e: { r: 8, c: 8 } }, // Date
      { s: { r: 9, c: 4 }, e: { r: 9, c: 8 } }, // Buyer name
      { s: { r: 10, c: 4 }, e: { r: 10, c: 8 } }, // Community
      { s: { r: 11, c: 4 }, e: { r: 11, c: 8 } }, // Lot number
      { s: { r: 12, c: 4 }, e: { r: 12, c: 8 } }, // Lot address
      { s: { r: 13, c: 4 }, e: { r: 13, c: 8 } }, // House plan
      { s: { r: 15, c: 4 }, e: { r: 15, c: 7 } }, // Base price label
      { s: { r: 16, c: 4 }, e: { r: 16, c: 7 } }, // Lot premium label
      { s: { r: 18, c: 4 }, e: { r: 18, c: 7 } }, // Description header
      { s: { r: grandTotalRow - 1, c: 0 }, e: { r: grandTotalRow - 1, c: 7 } }, // Grand total
      { s: { r: sigStartRow, c: 0 }, e: { r: sigStartRow + 1, c: 8 } } // Agreement text
    ];
    
    // Add column widths for better formatting
    ws['!cols'] = [
      { wch: 20 }, // A - Option
      { wch: 12 }, // B - Labels
      { wch: 3 },  // C - Bullet
      { wch: 20 }, // D - Address
      { wch: 20 }, // E - Description/Data
      { wch: 12 }, // F
      { wch: 3 },  // G - Bullet
      { wch: 15 }, // H - Phone/Summary Labels
      { wch: 12 }  // I - Subtotal/Values
    ];
    
    // Add row heights for better spacing
    ws['!rows'] = [
      { hpt: 25 }, // Title row
      null, null, null, null, null,
      { hpt: 20 }, // Address row
      null,
      { hpt: 18 }, // Form data rows
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 18 },
      null,
      { hpt: 20 }, // Pricing rows
      { hpt: 20 },
      null,
      { hpt: 20 }  // Headers
    ];
    
    // Apply comprehensive formatting to all cells
    const addCellFormatting = (cellAddr: string, cellData: any) => {
      if (!ws[cellAddr]) ws[cellAddr] = cellData;
      else Object.assign(ws[cellAddr], cellData);
    };

    // Apply all cell styles with proper formatting
    Object.keys(ws).forEach(cellAddress => {
      if (cellAddress.startsWith('!')) return;
      
      const cell = ws[cellAddress];
      if (!cell.s) cell.s = {};

      // Apply borders to all content cells
      const defaultBorder = {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      };

      // Title styling
      if (cellAddress === 'A1') {
        cell.s = {
          font: { bold: true, sz: 20, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          fill: { fgColor: { rgb: "1F4E79" } },
          border: {
            top: { style: "thick", color: { rgb: "000000" } },
            bottom: { style: "thick", color: { rgb: "000000" } },
            left: { style: "thick", color: { rgb: "000000" } },
            right: { style: "thick", color: { rgb: "000000" } }
          }
        };
      }
      
      // Company name styling
      else if (cellAddress === 'A3') {
        cell.s = {
          font: { bold: true, sz: 16, color: { rgb: "1F4E79" } },
          alignment: { horizontal: "center", vertical: "center" },
          fill: { fgColor: { rgb: "E7F3FF" } },
          border: {
            top: { style: "medium", color: { rgb: "1F4E79" } },
            bottom: { style: "medium", color: { rgb: "1F4E79" } },
            left: { style: "medium", color: { rgb: "1F4E79" } },
            right: { style: "medium", color: { rgb: "1F4E79" } }
          }
        };
      }
      
      // Address styling
      else if (['A7', 'C7', 'D7', 'G7', 'H7'].includes(cellAddress)) {
        cell.s = {
          font: { sz: 11, bold: false },
          alignment: { horizontal: "center", vertical: "center" },
          fill: { fgColor: { rgb: "F8F9FA" } },
          border: defaultBorder
        };
      }
      
      // Form labels styling (B9-B14)
      else if (['B9', 'B10', 'B11', 'B12', 'B13', 'B14'].includes(cellAddress)) {
        cell.s = {
          font: { bold: true, sz: 11 },
          alignment: { horizontal: "left", vertical: "center" },
          fill: { fgColor: { rgb: "E9ECEF" } },
          border: defaultBorder
        };
      }
      
      // Form data styling (E9-E14)
      else if (['E9', 'E10', 'E11', 'E12', 'E13', 'E14'].includes(cellAddress)) {
        cell.s = {
          font: { sz: 11 },
          alignment: { horizontal: "left", vertical: "center" },
          fill: { fgColor: { rgb: "FFFFFF" } },
          border: defaultBorder
        };
      }
      
      // Price labels (E16, E17)
      else if (['E16', 'E17'].includes(cellAddress)) {
        cell.s = {
          font: { bold: true, sz: 12 },
          alignment: { horizontal: "left", vertical: "center" },
          fill: { fgColor: { rgb: "D1ECF1" } },
          border: defaultBorder
        };
      }
      
      // Price values (I16, I17)
      else if (['I16', 'I17'].includes(cellAddress) && cell.t === 'n') {
        cell.s = {
          font: { sz: 12, bold: true },
          alignment: { horizontal: "right", vertical: "center" },
          numFmt: '"$"#,##0',
          fill: { fgColor: { rgb: "FFFFFF" } },
          border: defaultBorder
        };
      }
      
      // Header row styling (A19, E19, I19)
      else if (['A19', 'E19', 'I19'].includes(cellAddress)) {
        cell.s = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          fill: { fgColor: { rgb: "1F4E79" } },
          border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "medium", color: { rgb: "000000" } },
            right: { style: "medium", color: { rgb: "000000" } }
          }
        };
      }
      
      // Summary section styling
      else if (cell.v === 'SUMMARY:') {
        cell.s = {
          font: { bold: true, sz: 14, color: { rgb: "1F4E79" } },
          alignment: { horizontal: "center", vertical: "center" },
          fill: { fgColor: { rgb: "BDD7EE" } },
          border: defaultBorder
        };
      }
      
      // Summary labels
      else if (cellAddress.startsWith('H') && cell.v && typeof cell.v === 'string' && cell.v.includes(':')) {
        cell.s = {
          font: { bold: true, sz: 11 },
          alignment: { horizontal: "right", vertical: "center" },
          fill: { fgColor: { rgb: "E7F3FF" } },
          border: defaultBorder
        };
      }
      
      // Summary values
      else if (cellAddress.startsWith('I') && cell.t === 'n' && parseInt(cellAddress.substring(1)) > 35) {
        cell.s = {
          font: { sz: 11, bold: true },
          alignment: { horizontal: "right", vertical: "center" },
          numFmt: '"$"#,##0',
          fill: { fgColor: { rgb: "FFFFFF" } },
          border: defaultBorder
        };
        
        // Grand Total special formatting
        if (cell.f && cell.f.includes('SUM(I') && cell.f.includes(':I')) {
          cell.s.font.sz = 12;
          cell.s.fill = { fgColor: { rgb: "1F4E79" } };
          cell.s.font.color = { rgb: "FFFFFF" };
        }
      }
      
      // Signature section
      else if (cell.v && typeof cell.v === 'string' && 
               (cell.v.includes('Buyer Signature') || cell.v.includes('Representative') || cell.v.includes('acknowledge'))) {
        cell.s = {
          font: { sz: 10, bold: cell.v.includes('Signature') || cell.v.includes('Representative') },
          alignment: { horizontal: "left", vertical: "center" },
          fill: { fgColor: { rgb: "F8F9FA" } },
          border: defaultBorder
        };
      }
      
      // Default styling for remaining cells
      else if (cell.v !== undefined) {
        cell.s = {
          font: { sz: 10 },
          alignment: { horizontal: "left", vertical: "center" },
          fill: { fgColor: { rgb: "FFFFFF" } },
          border: defaultBorder
        };
      }
    });
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Order Summary');
    
    // Generate filename
    const filename = `PO_${currentTemplate.name}_${formData.buyerLastName || 'Draft'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    toast({
      title: "Excel Export Complete",
      description: "Purchase order exported with template format and preserved formulas.",
    });
  };

  const handleGeneratePO = () => {
    if (!currentTemplate) return;

    // Create PDF
    const pdf = new jsPDF();
    
    // Add Logo (centered at top)
    const logoImg = new Image();
    logoImg.onload = () => {
      // Logo - centered and properly sized
      pdf.addImage(logoImg, 'PNG', 85, 10, 40, 20);
      
      // Company contact info
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text("565 Village Center Dr  •  Burr Ridge, IL 60527-4516  •  Phone: 6309209430", 105, 35, { align: "center" });
      
      // Add subtle line separator
      pdf.setDrawColor(66, 139, 202);
      pdf.setLineWidth(0.5);
      pdf.line(20, 45, 190, 45);
      
      // Job Address Section (left side)
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text("DESIGNER HOME", 20, 60);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Job Address:", 20, 70);
      pdf.text("16520 Kayla Drive", 20, 78);
      pdf.text("Lemont, IL 60439", 20, 86);
      
      // Purchase Order Title (right side)
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(66, 139, 202);
      pdf.text("PURCHASE ORDER", 140, 65);
      pdf.setTextColor(0, 0, 0);
      
      // Buyer Information Section
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("BUYER INFORMATION", 20, 105);
      
      // Add background for buyer info
      pdf.setFillColor(248, 249, 250);
      pdf.rect(20, 110, 170, 35, 'F');
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      let yPos = 120;
      pdf.text(`Date: ${formData.todaysDate}`, 25, yPos);
      pdf.text(`Buyer Name: ${formData.buyerLastName}`, 110, yPos);
      yPos += 8;
      pdf.text(`Community: ${formData.community}`, 25, yPos);
      pdf.text(`Lot Number: ${formData.lotNumber}`, 110, yPos);
      yPos += 8;
      pdf.text(`Lot Address: ${formData.lotAddress}`, 25, yPos);
      yPos = 155;
    
      // Home Template Information
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("HOME TEMPLATE", 20, yPos);
      yPos += 5;
      
      // Template info background
      pdf.setFillColor(248, 249, 250);
      pdf.rect(20, yPos, 85, 25, 'F');
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      yPos += 8;
      pdf.text(`Model: ${currentTemplate.name}`, 25, yPos);
      yPos += 8;
      pdf.text(`Base Price: $${parseInt(currentTemplate.basePrice).toLocaleString()}`, 25, yPos);
      if (formData.lotPremium && parseInt(formData.lotPremium) > 0) {
        yPos += 8;
        pdf.text(`Lot Premium: $${parseInt(formData.lotPremium).toLocaleString()}`, 25, yPos);
      }
      yPos += 20;
      
      // Selected Upgrades Table
      if (selectedUpgradeItems.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("SELECTED UPGRADES", 20, yPos);
        yPos += 10;
        
        const upgradeTableData = selectedUpgradeItems.map(upgrade => [
          upgrade.choiceTitle,
          upgrade.category,
          upgrade.location,
          `$${parseInt(upgrade.clientPrice).toLocaleString()}`
        ]);
        
        autoTable(pdf, {
          startY: yPos,
          head: [['Choice Title', 'Category', 'Location', 'Price']],
          body: upgradeTableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [66, 139, 202],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 9,
            cellPadding: 4
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250]
          },
          columnStyles: {
            0: { cellWidth: 75 },
            1: { cellWidth: 40 },
            2: { cellWidth: 35 },
            3: { cellWidth: 30, halign: 'right' }
          }
        });
        
        yPos = (pdf as any).lastAutoTable.finalY + 15;
      }
      
      // Pricing Summary
      const basePrice = parseInt(currentTemplate.basePrice);
      const lotPremium = parseInt(formData.lotPremium || "0");
      const upgradesTotal = selectedUpgradeItems.reduce((sum, u) => sum + parseInt(u.clientPrice), 0);
      const grandTotal = basePrice + lotPremium + upgradesTotal;
      
      // Position pricing summary on the right side or below upgrades
      let summaryX = selectedUpgradeItems.length > 0 ? 120 : 20;
      let summaryY = selectedUpgradeItems.length > 0 && yPos < 200 ? 155 : yPos;
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("PRICING SUMMARY", summaryX, summaryY);
      
      // Pricing summary background
      pdf.setFillColor(66, 139, 202);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(summaryX, summaryY + 5, 70, 35, 'F');
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      summaryY += 15;
      pdf.text(`Base Price:`, summaryX + 5, summaryY);
      pdf.text(`$${basePrice.toLocaleString()}`, summaryX + 65, summaryY, { align: "right" });
      summaryY += 8;
      
      if (lotPremium > 0) {
        pdf.text(`Lot Premium:`, summaryX + 5, summaryY);
        pdf.text(`$${lotPremium.toLocaleString()}`, summaryX + 65, summaryY, { align: "right" });
        summaryY += 8;
      }
      
      if (upgradesTotal > 0) {
        pdf.text(`Upgrades Total:`, summaryX + 5, summaryY);
        pdf.text(`$${upgradesTotal.toLocaleString()}`, summaryX + 65, summaryY, { align: "right" });
        summaryY += 8;
      }
      
      // Grand Total
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(`TOTAL: $${grandTotal.toLocaleString()}`, summaryX + 5, summaryY);
      
      pdf.setTextColor(0, 0, 0);
      yPos = Math.max(yPos, summaryY + 25);
      
      // Signature Section
      if (yPos > 230) {
        pdf.addPage();
        pdf.addImage(logoImg, 'PNG', 85, 10, 40, 20);
        yPos = 50;
      }
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("SIGNATURES", 20, yPos);
      yPos += 15;
      
      // Signature boxes
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      
      // Buyer Signature
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Buyer Signature:", 20, yPos);
      pdf.text("Date:", 120, yPos);
      pdf.rect(20, yPos + 5, 80, 20);
      pdf.rect(120, yPos + 5, 50, 20);
      yPos += 35;
      
      // Company Representative Signature
      pdf.text("Beechen & Dill Homes Representative:", 20, yPos);
      pdf.text("Date:", 120, yPos);
      pdf.rect(20, yPos + 5, 80, 20);
      pdf.rect(120, yPos + 5, 50, 20);
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
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
    
    logoImg.src = logoPath;
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
