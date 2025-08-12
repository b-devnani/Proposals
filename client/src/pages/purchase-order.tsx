import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Plus, Minus, Package } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoPath from "@assets/logo-fullColor_1754013092305.png";
import { useToast } from "@/hooks/use-toast";
import { UpgradeTable } from "@/components/upgrade-table";
import { OrderSummary } from "@/components/order-summary";
import { CostTogglePassword } from "@/components/cost-toggle-password";
import { HomeTemplate, Upgrade } from "@shared/schema";
import { groupUpgradesByCategory, sortUpgrades } from "@/lib/upgrade-data";
import { apiRequest } from "@/lib/queryClient";
import { formatNumberWithCommas, handleNumberInputChange } from "@/lib/number-utils";

// Rolling Meadows lot data
const rollingMeadowsLots = {
  "RM03": "16571 Kayla Drive",
  "RM04": "16561 Kayla Drive", 
  "RM05": "16551 Kayla Drive",
  "RM06": "16541 Kayla Drive",
  "RM25": "16520 Kayla Drive",
  "RM26": "16530 Kayla Drive",
  "RM27": "16540 Kayla Drive",
  "RM28": "16550 Kayla Drive",
  "RM29": "16560 Kayla Drive",
  "RM30": "16570 Kayla Drive",
  "RM31": "16580 Kayla Drive",
  "RM32": "16590 Kayla Drive"
};

// Helper function to format community name
const formatCommunityName = (communityValue: string) => {
  switch (communityValue) {
    case 'rolling-meadows':
      return 'Rolling Meadows';
    case 'marble-landing':
      return 'Marble Landing';
    case 'copper-ridge':
      return 'Copper Ridge';
    default:
      return communityValue;
  }
};

export default function PurchaseOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  
  // State
  const [activeTemplate, setActiveTemplate] = useState<string>("2"); // Default to Sorrento
  const [showCostColumns, setShowCostColumns] = useState(false); // Off by default
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  
  // Special Request Options state
  const [specialRequestOptions, setSpecialRequestOptions] = useState<{
    id: number;
    description: string;
    price: string;
    builderCost: string;
  }[]>([]);
  const [nextSroId, setNextSroId] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    todaysDate: new Date().toISOString().split('T')[0],
    buyerLastName: "",
    community: "rolling-meadows", // Default to Rolling Meadows
    lotNumber: "",
    lotAddress: "",
    lotPremium: "0",
    salesIncentive: "0",
    designStudioAllowance: "0",
  });

  const [salesIncentiveEnabled, setSalesIncentiveEnabled] = useState(false);
  
  // Handler for lot selection
  const handleLotSelection = (lotNumber: string) => {
    const address = rollingMeadowsLots[lotNumber as keyof typeof rollingMeadowsLots] || "";
    setFormData({ 
      ...formData, 
      lotNumber, 
      lotAddress: address 
    });
  };

  // Special Request Options handlers
  const addSpecialRequestOption = () => {
    setSpecialRequestOptions([
      ...specialRequestOptions,
      {
        id: nextSroId,
        description: "",
        price: "0",
        builderCost: "0"
      }
    ]);
    setNextSroId(nextSroId + 1);
  };

  const removeSpecialRequestOption = (id: number) => {
    setSpecialRequestOptions(specialRequestOptions.filter(sro => sro.id !== id));
  };

  const updateSpecialRequestOption = (id: number, field: 'description' | 'price' | 'builderCost', value: string) => {
    setSpecialRequestOptions(specialRequestOptions.map(sro => 
      sro.id === id ? { ...sro, [field]: value } : sro
    ));
  };

  // Calculate SRO totals
  const specialRequestTotal = specialRequestOptions.reduce((sum, sro) => 
    sum + parseFloat(sro.price || "0"), 0
  );
  const specialRequestCostTotal = specialRequestOptions.reduce((sum, sro) => 
    sum + parseFloat(sro.builderCost || "0"), 0
  );

  // Queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery<HomeTemplate[]>({
    queryKey: ["/api/templates"],
  });

  // Set template based on URL parameter
  useEffect(() => {
    if (templates.length > 0 && params.template) {
      const template = templates.find(t => t.name.toLowerCase() === params.template?.toLowerCase());
      if (template) {
        setActiveTemplate(template.id.toString());
      }
    }
  }, [templates, params.template]);

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
    
    // Selected only filter
    const matchesSelectedOnly = !showSelectedOnly || selectedUpgrades.has(upgrade.id);
    
    return matchesSearch && matchesCategory && matchesLocation && matchesSelectedOnly;
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
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;
    
    const newSelected = new Set(selectedUpgrades);
    
    if (newSelected.has(upgradeId)) {
      // If already selected, just remove it
      newSelected.delete(upgradeId);
    } else {
      // If not selected, first remove any other selections from the same parent selection group
      const sameParentSelectionUpgrades = upgrades.filter(u => 
        u.category === upgrade.category && 
        u.location === upgrade.location && 
        u.parentSelection === upgrade.parentSelection
      );
      
      // Remove all other selections from the same parent selection group
      sameParentSelectionUpgrades.forEach(u => {
        if (u.id !== upgradeId) {
          newSelected.delete(u.id);
        }
      });
      
      // Add the new selection
      newSelected.add(upgradeId);
    }
    
    setSelectedUpgrades(newSelected);
  };

  const handleSelectAll = (category: string, location: string, parentSelection?: string) => {
    const newSelected = new Set(selectedUpgrades);
    
    if (parentSelection) {
      // For parent selection groups, only allow one selection at a time
      // So "select all" doesn't make sense - we'll clear all selections in this group
      const upgradesToClear = groupedUpgrades[category]?.[location]?.[parentSelection] || [];
      upgradesToClear.forEach(upgrade => {
        newSelected.delete(upgrade.id);
      });
    } else {
      // For location-level "select all", select one item from each parent selection group
      const locationData = groupedUpgrades[category]?.[location] || {};
      
      // Check if we have any selections in this location
      const hasAnySelection = Object.values(locationData).some(parentUpgrades => 
        parentUpgrades.some(upgrade => selectedUpgrades.has(upgrade.id))
      );
      
      if (hasAnySelection) {
        // If we have selections, clear all selections in this location
        Object.values(locationData).forEach(parentUpgrades => {
          parentUpgrades.forEach(upgrade => {
            newSelected.delete(upgrade.id);
          });
        });
      } else {
        // If no selections, select the first item from each parent selection group
        Object.values(locationData).forEach(parentUpgrades => {
          if (parentUpgrades.length > 0) {
            // Select the first upgrade in each parent selection group
            newSelected.add(parentUpgrades[0].id);
          }
        });
      }
    }
    
    setSelectedUpgrades(newSelected);
  };

  const handleExpandCollapseAll = (isExpanded: boolean) => {
    // This function can be used to expand/collapse all upgrade categories
    // Implementation depends on UpgradeTable component state management
    console.log(`${isExpanded ? 'Expanding' : 'Collapsing'} all categories`);
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

    // Set optimal column widths for readability and scaling
    worksheet.columns = [
      { width: 55 }, // A - Description/Label (auto-adjusts better at scale)
      { width: 20 }, // B - Value/Amount
      { width: 10 }, // C - Spacer
      { width: 10 }, // D - Spacer
      { width: 10 }, // E - Spacer
      { width: 10 }, // F - Spacer
      { width: 10 }, // G - Spacer
      { width: 10 }, // H - Spacer
      { width: 15 }  // I - Secondary Amount
    ];

    // Configure print settings
    worksheet.pageSetup = {
      // Paper size (Letter)
      paperSize: 'Letter' as any,
      // Orientation (Portrait)
      orientation: 'portrait',
      // Margins (Narrow)
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      },
      // Custom scaling: Fit to 1 page wide by 2 pages tall
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 2,
      // Center horizontally
      horizontalCentered: true,
      verticalCentered: false
    };
    
    // Modern Header Design
    const headerRow = worksheet.getRow(1);
    headerRow.height = 40;
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'HOME CONSTRUCTION PROPOSAL';
    headerCell.font = { name: 'Calibri', bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
    headerCell.alignment = { horizontal: 'left', vertical: 'middle' };
    headerCell.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
    
    const headerCellB = worksheet.getCell('B1');
    headerCellB.font = { name: 'Calibri', bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    headerCellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
    headerCellB.alignment = { horizontal: 'right', vertical: 'middle' };
    headerCellB.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
    
    // Company Information
    const companyRow = worksheet.getRow(2);
    companyRow.height = 25;
    const companyCell = worksheet.getCell('A2');
    companyCell.value = 'BEECHEN & DILL HOMES';
    companyCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF2E5C8A' } };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    companyCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    const companyCellB = worksheet.getCell('B2');
    companyCellB.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF2E5C8A' } };
    companyCellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    companyCellB.alignment = { horizontal: 'right', vertical: 'middle' };
    
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
    
    const customerHeaderCellB = worksheet.getCell('B5');
    customerHeaderCellB.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    customerHeaderCellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    customerHeaderCellB.alignment = { horizontal: 'right', vertical: 'middle' };
    customerHeaderCellB.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
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
      labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
      labelCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      const valueCell = worksheet.getCell(`B${currentRow}`);
      valueCell.value = value;
      valueCell.font = { name: 'Calibri', size: 10 };
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
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
    
    const pricingHeaderCellB = worksheet.getCell(`B${currentRow}`);
    pricingHeaderCellB.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    pricingHeaderCellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    pricingHeaderCellB.alignment = { horizontal: 'right', vertical: 'middle' };
    pricingHeaderCellB.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
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
    
    const basePricingStartRow = currentRow;
    baseItems.forEach(([label, amount]) => {
      const row = worksheet.getRow(currentRow);
      row.height = 22;
      
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = label;
      labelCell.font = { name: 'Calibri', bold: true, size: 11 };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
      labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
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
    const basePricingEndRow = currentRow - 1;
    
    // Spacer
    currentRow++;
    
    // Upgrades Section Header
    const upgradesHeaderRow = worksheet.getRow(currentRow);
    upgradesHeaderRow.height = 25;
    const upgradesHeaderCell = worksheet.getCell(`A${currentRow}`);
    upgradesHeaderCell.value = 'SELECTED OPTIONS';
    upgradesHeaderCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    upgradesHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    upgradesHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    upgradesHeaderCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    const upgradesHeaderCellB = worksheet.getCell(`B${currentRow}`);
    upgradesHeaderCellB.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    upgradesHeaderCellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    upgradesHeaderCellB.alignment = { horizontal: 'right', vertical: 'middle' };
    upgradesHeaderCellB.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    currentRow++;
    
    // Column headers for upgrades
    const upgradeHeaderRow = worksheet.getRow(currentRow);
    upgradeHeaderRow.height = 20;
    
    const optionHeaderCell = worksheet.getCell(`A${currentRow}`);
    optionHeaderCell.value = 'Selection Description';
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
    let upgradeRowIndex = 0;
    const upgradeStartRow = currentRow;
    
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
      
      const categoryCellB = worksheet.getCell(`B${currentRow}`);
      categoryCellB.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      categoryCellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
      categoryCellB.alignment = { horizontal: 'right', vertical: 'middle' };
      categoryCellB.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      currentRow++;
      
      Object.entries(locations).forEach(([location, parentSelections]) => {
        // Location Sub-Header
        const locationRow = worksheet.getRow(currentRow);
        locationRow.height = 22;
        
        const locationCell = worksheet.getCell(`A${currentRow}`);
        locationCell.value = `  ${location}`;
        locationCell.font = { name: 'Calibri', bold: true, size: 10 };
        locationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
        locationCell.alignment = { horizontal: 'left', vertical: 'middle' };
        locationCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        
        const locationCellB = worksheet.getCell(`B${currentRow}`);
        locationCellB.font = { name: 'Calibri', bold: true, size: 10 };
        locationCellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
        locationCellB.alignment = { horizontal: 'right', vertical: 'middle' };
        locationCellB.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        
        currentRow++;
        
        Object.entries(parentSelections).forEach(([parentSelection, upgrades]) => {
          // Add each upgrade item
          upgrades.forEach((upgrade) => {
            const row = worksheet.getRow(currentRow);
            row.height = 20;
            
            // Clean alternating row colors
            const isEvenRow = upgradeRowIndex % 2 === 0;
            const bgColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF';
            
            // Upgrade description
            const descCell = worksheet.getCell(`A${currentRow}`);
            descCell.value = `    ${upgrade.choiceTitle}`;
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
            upgradeRowIndex++;
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
    
    const summaryHeaderCellB = worksheet.getCell(`B${currentRow}`);
    summaryHeaderCellB.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    summaryHeaderCellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
    summaryHeaderCellB.alignment = { horizontal: 'right', vertical: 'middle' };
    summaryHeaderCellB.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
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
    baseSubtotalValue.value = { formula: `SUM(B${basePricingStartRow}:B${basePricingEndRow})` };
    baseSubtotalValue.numFmt = '"$"#,##0';
    baseSubtotalValue.font = { name: 'Calibri', bold: true, size: 11 };
    baseSubtotalValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
    baseSubtotalValue.alignment = { horizontal: 'right', vertical: 'middle' };
    baseSubtotalValue.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    const baseSubtotalRowNum = currentRow;
    
    currentRow++;
    
    // Options Total
    const upgradesSubtotalRow = worksheet.getRow(currentRow);
    upgradesSubtotalRow.height = 22;
    const upgradesSubtotalLabel = worksheet.getCell(`A${currentRow}`);
    upgradesSubtotalLabel.value = 'Options Total:';
    upgradesSubtotalLabel.font = { name: 'Calibri', bold: true, size: 11 };
    upgradesSubtotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
    upgradesSubtotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    upgradesSubtotalLabel.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    
    const upgradesSubtotalValue = worksheet.getCell(`B${currentRow}`);
    // Create SUM formula for upgrade rows - from upgrade header + 1 to current row - 2
    const upgradeStartFormula = upgradeStartRow;
    const upgradeEndFormula = currentRow - 2;
    if (upgradeStartFormula <= upgradeEndFormula) {
      upgradesSubtotalValue.value = { formula: `SUM(B${upgradeStartFormula}:B${upgradeEndFormula})` };
    } else {
      upgradesSubtotalValue.value = 0;
    }
    upgradesSubtotalValue.numFmt = '"$"#,##0';
    upgradesSubtotalValue.font = { name: 'Calibri', bold: true, size: 11 };
    upgradesSubtotalValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
    upgradesSubtotalValue.alignment = { horizontal: 'right', vertical: 'middle' };
    upgradesSubtotalValue.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    const upgradesSubtotalRowNum = currentRow;
    
    currentRow++;
    
    // Total Sales Price w/Options
    const grandTotalRow = worksheet.getRow(currentRow);
    grandTotalRow.height = 30;
    const grandTotalLabel = worksheet.getCell(`A${currentRow}`);
    grandTotalLabel.value = 'Total Sales Price w/Options:';
    grandTotalLabel.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    grandTotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5C8A' } };
    grandTotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    grandTotalLabel.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
    
    const grandTotalValue = worksheet.getCell(`B${currentRow}`);
    grandTotalValue.value = { formula: `B${baseSubtotalRowNum}+B${upgradesSubtotalRowNum}` };
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
    signatureCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    currentRow += 2;
    
    // Customer Signature Line
    const customerSigRow = worksheet.getRow(currentRow);
    customerSigRow.height = 25;
    const customerSigLabel = worksheet.getCell(`A${currentRow}`);
    customerSigLabel.value = 'Customer Signature:';
    customerSigLabel.font = { name: 'Calibri', bold: true, size: 10 };
    customerSigLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    customerSigLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const customerSigLine = worksheet.getCell(`B${currentRow}`);
    customerSigLine.value = '____________________________';
    customerSigLine.font = { name: 'Calibri', size: 10 };
    customerSigLine.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    customerSigLine.alignment = { horizontal: 'right', vertical: 'middle' };
    
    currentRow += 2;
    
    // Customer Date Line
    const customerDateRow = worksheet.getRow(currentRow);
    customerDateRow.height = 25;
    const customerDateLabel = worksheet.getCell(`A${currentRow}`);
    customerDateLabel.value = 'Date:';
    customerDateLabel.font = { name: 'Calibri', bold: true, size: 10 };
    customerDateLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    customerDateLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const customerDateLine = worksheet.getCell(`B${currentRow}`);
    customerDateLine.value = '___________';
    customerDateLine.font = { name: 'Calibri', size: 10 };
    customerDateLine.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    customerDateLine.alignment = { horizontal: 'right', vertical: 'middle' };
    
    currentRow += 2;
    
    // Sales Representative Signature Line
    const salesSigRow = worksheet.getRow(currentRow);
    salesSigRow.height = 25;
    const salesSigLabel = worksheet.getCell(`A${currentRow}`);
    salesSigLabel.value = 'Sales Representative:';
    salesSigLabel.font = { name: 'Calibri', bold: true, size: 10 };
    salesSigLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    salesSigLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const salesSigLine = worksheet.getCell(`B${currentRow}`);
    salesSigLine.value = '____________________________';
    salesSigLine.font = { name: 'Calibri', size: 10 };
    salesSigLine.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    salesSigLine.alignment = { horizontal: 'right', vertical: 'middle' };
    
    currentRow += 2;
    
    // Sales Representative Date Line
    const salesDateRow = worksheet.getRow(currentRow);
    salesDateRow.height = 25;
    const salesDateLabel = worksheet.getCell(`A${currentRow}`);
    salesDateLabel.value = 'Date:';
    salesDateLabel.font = { name: 'Calibri', bold: true, size: 10 };
    salesDateLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    salesDateLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const salesDateLine = worksheet.getCell(`B${currentRow}`);
    salesDateLine.value = '___________';
    salesDateLine.font = { name: 'Calibri', size: 10 };
    salesDateLine.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    salesDateLine.alignment = { horizontal: 'right', vertical: 'middle' };
    
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
    
    const baseSubtotal = parseFloat(currentTemplate.basePrice) + parseFloat(formData.lotPremium || "0") + (salesIncentiveEnabled ? parseFloat(formData.salesIncentive || "0") : 0);
    const upgradesTotal = selectedUpgradeItems.reduce((sum, upgrade) => sum + parseFloat(upgrade.clientPrice), 0);
    const totalPrice = baseSubtotal + parseFloat(formData.designStudioAllowance || "0") + upgradesTotal + specialRequestTotal;
    
    const proposalData = {
      todaysDate: new Date().toISOString().split('T')[0],
      buyerLastName: formData.buyerLastName || "Customer",
      community: formData.community || "Rolling Meadows",
      lotNumber: formData.lotNumber || "1",
      lotAddress: formData.lotAddress || "TBD",
      housePlan: currentTemplate.name,
      basePrice: currentTemplate.basePrice,
      lotPremium: formData.lotPremium || "0",
      selectedUpgrades: selectedUpgradeItems.map(upgrade => upgrade.id.toString()),
      totalPrice: totalPrice.toString()
    };

    try {
      await apiRequest('POST', '/api/proposals', proposalData);
      
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

  const generatePDF = async () => {
    if (!currentTemplate) return;
    
    const baseSubtotal = parseFloat(currentTemplate.basePrice) + parseFloat(formData.lotPremium || "0") + (salesIncentiveEnabled ? parseFloat(formData.salesIncentive || "0") : 0);
    const upgradesTotal = selectedUpgradeItems.reduce((sum, upgrade) => sum + parseFloat(upgrade.clientPrice), 0);
    const totalPrice = baseSubtotal + parseFloat(formData.designStudioAllowance || "0") + upgradesTotal + specialRequestTotal;
    
    const doc = new jsPDF();
    
    // Define consistent margins
    const leftMargin = 15;
    const rightMargin = 15;
    const topMargin = 15;
    const bottomMargin = 25; // Space for footer
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const footerY = pageHeight - 10; // Footer position
    
    // Add logo in top left corner with margin
    try {
      doc.addImage(logoPath, 'PNG', leftMargin, topMargin, 40, 20); // x, y, width, height
    } catch (error) {
      console.log("Logo could not be added to PDF:", error);
    }
    
    // Title - center aligned with logo height
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const titleText = "Exhibit C - New Home Pricing Proposal";
    const titleWidth = doc.getTextWidth(titleText);
    const centerX = (pageWidth - titleWidth) / 2;
    doc.text(titleText, centerX, topMargin + 10); // Center aligned and positioned at logo center height
    
    // Customer Information - positioned immediately after logo with no gap
    doc.setFontSize(9); // Optimal size for readability
    const customerInfoData = [
      ['Date', new Date().toLocaleDateString()],
      ['Customer Name', formData.buyerLastName || 'Not specified'],
      ['Community', formatCommunityName(formData.community) || 'Not specified'],
      ['Lot Number', formData.lotNumber || 'TBD'],
      ['Lot Address', formData.lotAddress || 'TBD'],
      ['Home Plan', currentTemplate.name]
    ];
    
    // Two-column layout: Optimized for readability and aesthetics
    let yPos = topMargin + 22; // Start immediately after logo/title line
    const leftColumnX = leftMargin;
    const leftColumnWidth = 110; // Further reduced width for tighter layout
    const columnGap = 8; // Minimal gap between columns
    const rightColumnX = leftColumnX + leftColumnWidth + columnGap;
    const rightColumnWidth = contentWidth - leftColumnWidth - columnGap;
    
    // Customer Information - Left Column
    let leftYPos = yPos;
    customerInfoData.forEach(([label, value]) => {
      // Label - medium gray for better contrast
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80); // Medium gray for better readability
      doc.text(label, leftColumnX, leftYPos);
      
      // Value - black, bold, with very close spacing
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Black
      doc.text(value, leftColumnX + 38, leftYPos); // Much closer to label
      
      // Subtle underline for visual separation
      doc.setDrawColor(180, 180, 180); // Slightly darker gray
      doc.setLineWidth(0.3);
      doc.line(leftColumnX + 38, leftYPos + 2.5, leftColumnX + leftColumnWidth - 3, leftYPos + 2.5);
      
      leftYPos += 7; // Tighter line spacing
    });
    
    // Base Pricing - Right Column (no header)
    doc.setFontSize(9); // Match customer info font size for consistency
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0); // Reset to black
    
    let rightYPos = yPos + 14; // Start two lines lower (2 * 7pt spacing)
    const basePricing = [
      [`Base Price:`, `$${parseInt(currentTemplate.basePrice).toLocaleString()}`],
      [`Lot Premium:`, `$${parseInt(formData.lotPremium || "0").toLocaleString()}`],
    ];
    
    if (salesIncentiveEnabled) {
      const salesAmount = parseInt(formData.salesIncentive || "0");
      const formattedSales = salesAmount < 0 ? `($${Math.abs(salesAmount).toLocaleString()})` : `$${salesAmount.toLocaleString()}`;
      basePricing.push([`Sales Adjustment:`, formattedSales]);
    }
    
    basePricing.push([`Design Studio Allowance:`, `$${parseInt(formData.designStudioAllowance || "0").toLocaleString()}`]);
    
    basePricing.forEach(([label, value]) => {
      // Label - consistent styling with customer info
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80); // Medium gray to match customer info
      doc.text(label, rightColumnX, rightYPos);
      
      // Value - bold and right-aligned to match subtotals column
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Black
      const valueWidth = doc.getTextWidth(value);
      // Align with subtotals column
      const subtotalColumnX = leftMargin + 10 + 45 + 100; // rowNumWidth + locationWidth + optionWidth
      const rightAlignX = subtotalColumnX + 30 - valueWidth - 1; // subtotalWidth - valueWidth - padding
      doc.text(value, rightAlignX, rightYPos);
      
      rightYPos += 7; // Tighter spacing to match customer info
    });
    
    // Set yPos to the maximum of both columns for next section
    yPos = Math.max(leftYPos, rightYPos) + 10;
    
    // Selections Table
    if (selectedUpgradeItems.length > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      
      // Table headers with proper borders and alignment
      const rowNumX = leftMargin;
      const rowNumWidth = 10;
      const locationX = rowNumX + rowNumWidth;
      const locationWidth = 45;
      const optionX = locationX + locationWidth;
      const optionWidth = 100;
      const subtotalX = optionX + optionWidth;
      const subtotalWidth = 30;
      const tableWidth = rowNumWidth + locationWidth + optionWidth + subtotalWidth;
      const rowHeight = 5.5; // Reduced to fit 30+ rows on first page
      
      // Header background and borders
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.rect(rowNumX, yPos - 2, tableWidth, rowHeight, 'FD');
      
      // Header cell borders
      doc.line(locationX, yPos - 2, locationX, yPos + 3.5); // Row#|Location
      doc.line(optionX, yPos - 2, optionX, yPos + 3.5); // Location|Option
      doc.line(subtotalX, yPos - 2, subtotalX, yPos + 3.5); // Option|Subtotal
      
      doc.setTextColor(0, 0, 0);
      doc.text("#", rowNumX + rowNumWidth - 3, yPos + 2); // Right-aligned, vertically centered
      doc.text("Location", locationX + 2, yPos + 2);
      doc.text("Option", optionX + 2, yPos + 2);
      doc.text("Subtotal", subtotalX + subtotalWidth - 15, yPos + 2); // Right-aligned header, vertically centered
      yPos += rowHeight;
      
      const groupedUpgrades = groupUpgradesByCategory(selectedUpgradeItems);
      let globalRowNumber = 1; // Track row numbers across all categories and locations
      
      Object.entries(groupedUpgrades).forEach(([category, locations]) => {
        // Category parent row merged across entire table width
        doc.setFillColor(230, 230, 230);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.5);
        doc.rect(rowNumX, yPos - 2, tableWidth, rowHeight, 'FD');
        
        // Center-align category text across the entire table width
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const categoryText = category.toUpperCase();
        const categoryTextWidth = doc.getTextWidth(categoryText);
        const centerCategoryX = rowNumX + (tableWidth - categoryTextWidth) / 2;
        doc.text(categoryText, centerCategoryX, yPos + 2);
        yPos += rowHeight;
        
        doc.setFont("helvetica", "normal");
        
        Object.entries(locations).forEach(([location, parentSelections], locationIndex) => {
          // Count total rows for this location
          let totalRowsForLocation = 0;
          Object.entries(parentSelections).forEach(([parentSelection, upgrades]) => {
            totalRowsForLocation += upgrades.length;
          });
          
          let currentRowIndex = 0;
          let locationCellDrawn = false;
          
          Object.entries(parentSelections).forEach(([parentSelection, upgrades]) => {
            upgrades.forEach((upgrade) => {
              // Check if we need a new page
              if (yPos > pageHeight - bottomMargin - 20) {
                doc.addPage();
                yPos = topMargin;
                locationCellDrawn = false; // Reset for new page
                
                // Repeat headers on new page
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setFillColor(245, 245, 245);
                doc.setDrawColor(100, 100, 100);
                doc.setLineWidth(0.5);
                doc.rect(rowNumX, yPos - 2, tableWidth, rowHeight, 'FD');
                doc.line(locationX, yPos - 2, locationX, yPos + 3.5);
                doc.line(optionX, yPos - 2, optionX, yPos + 3.5);
                doc.line(subtotalX, yPos - 2, subtotalX, yPos + 3.5);
                doc.setTextColor(0, 0, 0);
                doc.text("#", rowNumX + rowNumWidth - 3, yPos + 2);
                doc.text("Location", locationX + 2, yPos + 2);
                doc.text("Option", optionX + 2, yPos + 2);
                doc.text("Subtotal", subtotalX + subtotalWidth - 15, yPos + 2);
                yPos += rowHeight;
                doc.setFont("helvetica", "normal");
              }
              
              // Draw location merged cell if not drawn yet on this page
              if (!locationCellDrawn) {
                const remainingRows = totalRowsForLocation - currentRowIndex;
                const availableRowsOnPage = Math.floor((pageHeight - bottomMargin - 20 - yPos + rowHeight) / rowHeight);
                const rowsForThisPageSegment = Math.min(remainingRows, availableRowsOnPage);
                
                if (rowsForThisPageSegment > 0) {
                  const locationCellHeight = rowsForThisPageSegment * rowHeight;
                  doc.setFillColor(248, 248, 248);
                  doc.setDrawColor(150, 150, 150);
                  doc.setLineWidth(0.5);
                  doc.rect(locationX, yPos - 2, locationWidth, locationCellHeight, 'FD');
                  
                  // Center location text in merged cell
                  doc.setTextColor(60, 60, 60);
                  const locationTextWidth = doc.getTextWidth(location);
                  const centerLocationX = locationX + (locationWidth - locationTextWidth) / 2;
                  const centerLocationY = yPos + (locationCellHeight / 2) - 1;
                  doc.text(location, centerLocationX, centerLocationY);
                  locationCellDrawn = true;
                }
              }
              
              // Row background for all cells (alternating)
              if (currentRowIndex % 2 === 0) {
                doc.setFillColor(250, 250, 250);
              } else {
                doc.setFillColor(255, 255, 255);
              }
              
              // Draw row number cell
              doc.setDrawColor(150, 150, 150);
              doc.setLineWidth(0.5);
              doc.rect(rowNumX, yPos - 2, rowNumWidth, rowHeight, 'FD');
              
              // Draw option cell
              doc.rect(optionX, yPos - 2, optionWidth, rowHeight, 'FD');
              
              // Draw subtotal cell
              doc.rect(subtotalX, yPos - 2, subtotalWidth, rowHeight, 'FD');
              
              // Row number (right-aligned, vertically centered)
              doc.setTextColor(0, 0, 0);
              const rowNumText = globalRowNumber.toString();
              const rowNumTextWidth = doc.getTextWidth(rowNumText);
              const rightAlignRowNumX = rowNumX + rowNumWidth - rowNumTextWidth - 1;
              doc.text(rowNumText, rightAlignRowNumX, yPos + 2);
              
              // Option text (vertically centered)
              const optionText = upgrade.choiceTitle.length > 62 ? 
                upgrade.choiceTitle.substring(0, 59) + "..." : 
                upgrade.choiceTitle;
              doc.text(optionText, optionX + 2, yPos + 2);
              
              // Subtotal (right-aligned, vertically centered)
              const price = `$${parseInt(upgrade.clientPrice).toLocaleString()}`;
              const priceWidth = doc.getTextWidth(price);
              const rightAlignSubtotalX = subtotalX + subtotalWidth - priceWidth - 1;
              doc.text(price, rightAlignSubtotalX, yPos + 2);
              
              yPos += rowHeight;
              currentRowIndex++;
              globalRowNumber++;
            });
          });

        });
      });
      
      // Add Special Request Options if any exist
      if (specialRequestOptions.length > 0) {
        // Add spacing
        yPos += 5;
        
        // Special Request Options header
        doc.setFillColor(230, 230, 230);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.5);
        doc.rect(rowNumX, yPos - 2, tableWidth, rowHeight, 'FD');
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const sroHeaderText = "SPECIAL REQUEST OPTIONS";
        const sroHeaderTextWidth = doc.getTextWidth(sroHeaderText);
        const centerSroHeaderX = rowNumX + (tableWidth - sroHeaderTextWidth) / 2;
        doc.text(sroHeaderText, centerSroHeaderX, yPos + 2);
        yPos += rowHeight;
        
        doc.setFont("helvetica", "normal");
        
        // Add each special request option
        specialRequestOptions.forEach((sro, index) => {
          // Check if we need a new page
          if (yPos > pageHeight - bottomMargin - 20) {
            doc.addPage();
            yPos = topMargin;
            
            // Repeat headers on new page
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setFillColor(245, 245, 245);
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(0.5);
            doc.rect(rowNumX, yPos - 2, tableWidth, rowHeight, 'FD');
            doc.line(locationX, yPos - 2, locationX, yPos + 3.5);
            doc.line(optionX, yPos - 2, optionX, yPos + 3.5);
            doc.line(subtotalX, yPos - 2, subtotalX, yPos + 3.5);
            doc.setTextColor(0, 0, 0);
            doc.text("#", rowNumX + rowNumWidth - 3, yPos + 2);
            doc.text("Location", locationX + 2, yPos + 2);
            doc.text("Option", optionX + 2, yPos + 2);
            doc.text("Subtotal", subtotalX + subtotalWidth - 15, yPos + 2);
            yPos += rowHeight;
            doc.setFont("helvetica", "normal");
          }
          
          // Row background (alternating)
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          
          // Draw cells
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.5);
          doc.rect(rowNumX, yPos - 2, rowNumWidth, rowHeight, 'FD');
          doc.rect(locationX, yPos - 2, locationWidth, rowHeight, 'FD');
          doc.rect(optionX, yPos - 2, optionWidth, rowHeight, 'FD');
          doc.rect(subtotalX, yPos - 2, subtotalWidth, rowHeight, 'FD');
          
          // Row number (continuing from last globalRowNumber)
          doc.setTextColor(0, 0, 0);
          const sroRowNumText = globalRowNumber.toString();
          const sroRowNumTextWidth = doc.getTextWidth(sroRowNumText);
          const rightAlignSroRowNumX = rowNumX + rowNumWidth - sroRowNumTextWidth - 1;
          doc.text(sroRowNumText, rightAlignSroRowNumX, yPos + 2);
          
          // Location (Special Request)
          doc.setTextColor(60, 60, 60);
          const locationText = "Special Request";
          const locationTextWidth = doc.getTextWidth(locationText);
          const centerLocationX = locationX + (locationWidth - locationTextWidth) / 2;
          doc.text(locationText, centerLocationX, yPos + 2);
          
          // Option description
          doc.setTextColor(0, 0, 0);
          const sroOptionText = sro.description.length > 62 ? 
            sro.description.substring(0, 59) + "..." : 
            sro.description;
          doc.text(sroOptionText, optionX + 2, yPos + 2);
          
          // Subtotal (right-aligned)
          const sroPrice = `$${parseInt(sro.price).toLocaleString()}`;
          const sroPriceWidth = doc.getTextWidth(sroPrice);
          const rightAlignSroSubtotalX = subtotalX + subtotalWidth - sroPriceWidth - 1;
          doc.text(sroPrice, rightAlignSroSubtotalX, yPos + 2);
          
          yPos += rowHeight;
          globalRowNumber++;
        });
        
      }
      
      // Options Total (includes both standard selections and SROs)
      yPos += 5;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      // Align label with options column
      const selectionsOptionX = leftMargin + 10 + 45; // rowNumWidth + locationWidth
      doc.text("Options Total:", selectionsOptionX, yPos);
      // Align value with subtotals column - combine upgrades and SRO totals
      const totalOptionsValue = upgradesTotal + specialRequestTotal;
      const selectionsSubtotalValue = `$${totalOptionsValue.toLocaleString()}`;
      const selectionsSubtotalWidth = doc.getTextWidth(selectionsSubtotalValue);
      const selectionsSubtotalColumnX = leftMargin + 10 + 45 + 100; // rowNumWidth + locationWidth + optionWidth
      const selectionsSubtotalX = selectionsSubtotalColumnX + 30 - selectionsSubtotalWidth - 1; // subtotalWidth - selectionsSubtotalWidth - padding
      doc.text(selectionsSubtotalValue, selectionsSubtotalX, yPos);
      yPos += 8; // Reduced spacing
    }
    
    // Total Sales Price w/Options
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    // Align label with options column
    const grandTotalOptionX = leftMargin + 10 + 45; // rowNumWidth + locationWidth
    doc.text("Total Sales Price w/Options:", grandTotalOptionX, yPos);
    // Align value with subtotals column
    const grandTotalValue = `$${totalPrice.toLocaleString()}`;
    const grandTotalWidth = doc.getTextWidth(grandTotalValue);
    const grandTotalSubtotalX = leftMargin + 10 + 45 + 100; // rowNumWidth + locationWidth + optionWidth
    const grandTotalX = grandTotalSubtotalX + 30 - grandTotalWidth - 1; // subtotalWidth - grandTotalWidth - padding
    doc.text(grandTotalValue, grandTotalX, yPos);
    yPos += 15;
    
    // Check if there's not enough space for signatures (need ~60pt for full signature section)
    const signatureSpaceNeeded = 60; // Space needed for signature section
    const footerSpace = 30; // Space for footer
    const availableSpace = pageHeight - footerSpace - yPos;
    
    if (availableSpace < signatureSpaceNeeded) {
      doc.addPage();
      yPos = 10; // Minimal margin for maximum space on new page
    }
    
    // Single signature line spanning most of the page width
    doc.setFont("helvetica", "normal");
    const signatureLineWidth = pageWidth - (leftMargin * 2);
    yPos += 5; // Move line down to create more signing space above
    doc.line(leftMargin, yPos, leftMargin + signatureLineWidth, yPos);
    yPos += 3; // Space between line and buyer text
    
    // Two column layout for signatures
    const signatureColumnWidth = signatureLineWidth / 2;
    const signatureLeftX = leftMargin;
    const signatureRightX = leftMargin + signatureColumnWidth;
    
    // Get today's date in MM/DD/YYYY format
    const today = new Date();
    const todayFormatted = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Smaller font for buyer signatures
    doc.setFontSize(9);
    
    // Left column - First Buyer
    doc.text("Buyer", signatureLeftX, yPos);
    doc.text(todayFormatted, signatureLeftX + 60, yPos);
    
    // Right column - Second Buyer  
    doc.text("Buyer", signatureRightX, yPos);
    doc.text(todayFormatted, signatureRightX + 60, yPos);
    
    yPos += 15; // Reduced gap between buyer and acceptance signatures
    
    // Legal agreement section with two columns (50-50 split)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    // 50-50 column split
    const legalColumnWidth = signatureLineWidth * 0.5;
    const rightColumnStart = signatureLeftX + legalColumnWidth;
    
    // Left column - Legal text (5 lines)
    const legalText = [
      "Once signed by Buyer and accepted by B&D Authorized Agent,",
      "this agreement will become a legal binding agreement. Be sure", 
      "that all provisions have been read and understood before",
      "signing. The terms, conditions and provisions of the agreement",
      "are subject to acceptance by B&D Authorized Agent."
    ];
    
    let legalTextY = yPos;
    legalText.forEach(line => {
      doc.text(line, signatureLeftX, legalTextY);
      legalTextY += 4; // 4pt line spacing
    });
    
    // Right column - Acceptance signature at same height as legal text
    const acceptanceX = signatureRightX; // Same position as "Buyer" above
    
    // Signature line for acceptance (at same height as legal text)
    const acceptanceLineY = yPos + 8; // Same height as legal text
    doc.line(acceptanceX, acceptanceLineY, leftMargin + signatureLineWidth, acceptanceLineY);
    
    // Acceptance text below line (closer to underline)
    doc.setFontSize(9);
    doc.text("Accepted By", acceptanceX, acceptanceLineY + 4);
    doc.text(todayFormatted, acceptanceX + 60, acceptanceLineY + 4);
    
    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Customer Initials - Bottom Left
      doc.text("Customer Initials: _____", leftMargin, footerY);
      
      // Page Number - Bottom Center
      const pageText = `Page ${i} of ${totalPages}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      const centerX = (pageWidth - pageTextWidth) / 2;
      doc.text(pageText, centerX, footerY);
    }
    
    // Save PDF
    doc.save(`${formData.buyerLastName || 'Customer'}_Proposal_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGeneratePO = async () => {
    if (!currentTemplate) return;
    
    const baseSubtotal = parseFloat(currentTemplate.basePrice) + parseFloat(formData.lotPremium || "0") + (salesIncentiveEnabled ? parseFloat(formData.salesIncentive || "0") : 0);
    const upgradesTotal = selectedUpgradeItems.reduce((sum, upgrade) => sum + parseFloat(upgrade.clientPrice), 0);
    const totalPrice = baseSubtotal + parseFloat(formData.designStudioAllowance || "0") + upgradesTotal;
    
    const proposalData = {
      todaysDate: new Date().toISOString().split('T')[0],
      buyerLastName: formData.buyerLastName || "Customer",
      community: formData.community || "Rolling Meadows",
      lotNumber: formData.lotNumber || "1",
      lotAddress: formData.lotAddress || "TBD",
      housePlan: currentTemplate.name,
      basePrice: currentTemplate.basePrice,
      lotPremium: formData.lotPremium || "0",
      selectedUpgrades: selectedUpgradeItems.map(upgrade => upgrade.id.toString()),
      totalPrice: totalPrice.toString()
    };

    try {
      // Save to database
      await apiRequest('POST', '/api/proposals', proposalData);
      
      // Generate PDF
      await generatePDF();
      
      toast({
        title: "Proposal Generated",
        description: "Your proposal PDF has been generated and downloaded.",
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
  const groupedUpgrades = groupUpgradesByCategory(filteredUpgrades);

  // Get unique categories and locations for filters
  const uniqueCategories = Array.from(new Set(upgrades?.map(u => u.category) || [])).sort();
  const uniqueLocations = Array.from(new Set(upgrades?.map(u => u.location) || [])).sort();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header with Back Button and Theme Toggle */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                ← Back to Floor Plans
              </Button>
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {currentTemplate.name} Proposal Generator
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Create detailed proposals with home templates and selections</p>
        </div>

        {/* Template Information */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">{currentTemplate.name} Configuration</h2>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Label htmlFor="cost-toggle" className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
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

            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                          <Select 
                            value={formData.lotNumber} 
                            onValueChange={handleLotSelection}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select lot number" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(rollingMeadowsLots).map((lotNumber) => (
                                <SelectItem key={lotNumber} value={lotNumber}>
                                  {lotNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="lot-address">Lot Address</Label>
                          <Input
                            id="lot-address"
                            placeholder="Address will auto-populate"
                            value={formData.lotAddress}
                            readOnly
                            className="bg-gray-50 dark:bg-gray-800"
                          />
                        </div>

                        <div>
                          <Label htmlFor="house-plan">House Plan</Label>
                          <Input
                            id="house-plan"
                            value={currentTemplate.name}
                            readOnly
                            className="bg-gray-50 dark:bg-gray-800"
                          />
                        </div>
                      </div>

                      {/* Base Price Editor */}
                      <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {currentTemplate.name} Pricing
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Base pricing for this home template</p>
                            </div>
                            <div className="flex items-center space-x-6">
                              {showCostColumns && (
                                <div className="flex items-center space-x-2">
                                  <Label htmlFor="base-cost" className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost $</Label>
                                  <Input
                                    id="base-cost"
                                    type="text"
                                    className="w-40"
                                    value={formatNumberWithCommas(currentTemplate.baseCost || "0")}
                                    onChange={(e) => handleNumberInputChange(e.target.value, handleBaseCostUpdate)}
                                  />
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <Label htmlFor="base-price" className="text-sm font-medium text-gray-700 dark:text-gray-300">Price $</Label>
                                <Input
                                  id="base-price"
                                  type="text"
                                  className="w-40 font-semibold"
                                  value={formatNumberWithCommas(currentTemplate.basePrice)}
                                  onChange={(e) => handleNumberInputChange(e.target.value, handleBasePriceUpdate)}
                                />
                              </div>
                            </div>
                          </div>

                        </CardContent>
                      </Card>

                      {/* Lot Premium */}
                      <Card className="mb-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Lot Premium</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Additional cost for lot location</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="lot-premium" className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount $</Label>
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
                        <Card className="mb-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Sales Incentive</h4>
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
                                <Label htmlFor="sales-incentive" className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount $</Label>
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
                      <Card className="mb-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Design Studio Allowance</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Credit for design studio selections</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="design-studio-allowance" className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount $</Label>
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
                </CardContent>
          </Card>

            {/* Special Request Options */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Special Request Options</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Custom selections not included in standard options</p>
                  </div>
                  <Button
                    onClick={addSpecialRequestOption}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add New SRO
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {specialRequestOptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">No special request options added</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "Add New SRO" to create custom selections</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Headers Row */}
                    {specialRequestOptions.length > 0 && (
                      <div className="grid gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border dark:border-gray-700 font-medium text-sm text-gray-700 dark:text-gray-300" 
                           style={{
                             gridTemplateColumns: showCostColumns 
                               ? "1fr 120px 120px 40px" 
                               : "1fr 120px 40px"
                           }}>
                        <div>Description</div>
                        {showCostColumns && <div className="text-center">Builder Cost</div>}
                        <div className="text-center">Client Price</div>
                        <div></div>
                      </div>
                    )}
                    
                    {specialRequestOptions.map((sro, index) => (
                      <div key={sro.id} className="space-y-2">
                        {/* SRO Header */}
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 px-2">
                          SRO #{String(index + 1).padStart(2, '0')}
                        </div>
                        
                        {/* Input Row */}
                        <div className="grid gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 items-center"
                             style={{
                               gridTemplateColumns: showCostColumns 
                                 ? "1fr 120px 120px 40px" 
                                 : "1fr 120px 40px"
                             }}>
                          <div>
                            <Input
                              placeholder="Enter description..."
                              value={sro.description}
                              onChange={(e) => updateSpecialRequestOption(sro.id, 'description', e.target.value)}
                            />
                          </div>
                          
                          {showCostColumns && (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-700">$</span>
                              <Input
                                type="text"
                                placeholder="0"
                                value={formatNumberWithCommas(sro.builderCost)}
                                onChange={(e) => handleNumberInputChange(e.target.value, (value) => 
                                  updateSpecialRequestOption(sro.id, 'builderCost', value)
                                )}
                                className="text-right"
                              />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-700">$</span>
                            <Input
                              type="text"
                              placeholder="0"
                              value={formatNumberWithCommas(sro.price)}
                              onChange={(e) => handleNumberInputChange(e.target.value, (value) => 
                                updateSpecialRequestOption(sro.id, 'price', value)
                              )}
                              className="text-right"
                            />
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSpecialRequestOption(sro.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {specialRequestOptions.length > 0 && (
                      <div className="flex justify-end pt-2 border-t border-gray-200">
                        <div className="text-sm font-semibold text-gray-900">
                          Total: ${specialRequestTotal.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search and Filter Controls */}
            <Card className="mb-4">
              <CardContent className="pt-4 sm:pt-6">
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div>
                    <Label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Search Selections
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
                  
                  {/* Filters Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="category-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Category
                      </Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full">
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
                      <Label htmlFor="location-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Location
                      </Label>
                      <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger className="w-full">
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

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Show Selected Only
                      </Label>
                      <div className="flex items-center space-x-2 h-10">
                        <Checkbox
                          id="show-selected-only"
                          checked={showSelectedOnly}
                          onCheckedChange={(checked) => setShowSelectedOnly(checked === true)}
                        />
                        <Label htmlFor="show-selected-only" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                          Selected ({selectedUpgrades.size})
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchTerm("");
                          setCategoryFilter("all");
                          setLocationFilter("all");
                          setShowSelectedOnly(false);
                        }}
                        className="h-10 w-full sm:w-auto"
                        size="sm"
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
                    specialRequestOptions={specialRequestOptions}
                    specialRequestTotal={specialRequestTotal}
                    showCostColumns={showCostColumns}
                    onSaveDraft={handleSaveDraft}
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
