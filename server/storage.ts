import { 
  homeTemplates, 
  type HomeTemplate, 
  type InsertHomeTemplate,
  upgrades,
  type Upgrade,
  type InsertUpgrade,
  purchaseOrders,
  type PurchaseOrder,
  type InsertPurchaseOrder
} from "@shared/schema";

export interface IStorage {
  // Home Templates
  getHomeTemplates(): Promise<HomeTemplate[]>;
  getHomeTemplate(id: number): Promise<HomeTemplate | undefined>;
  updateHomeTemplate(id: number, template: Partial<InsertHomeTemplate>): Promise<HomeTemplate | undefined>;
  
  // Upgrades
  getUpgrades(): Promise<Upgrade[]>;
  getUpgradesByCategory(category: string): Promise<Upgrade[]>;
  
  // Purchase Orders
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
}

export class MemStorage implements IStorage {
  private homeTemplatesMap: Map<number, HomeTemplate>;
  private upgradesMap: Map<number, Upgrade>;
  private purchaseOrdersMap: Map<number, PurchaseOrder>;
  private currentTemplateId: number;
  private currentUpgradeId: number;
  private currentOrderId: number;

  constructor() {
    this.homeTemplatesMap = new Map();
    this.upgradesMap = new Map();
    this.purchaseOrdersMap = new Map();
    this.currentTemplateId = 1;
    this.currentUpgradeId = 1;
    this.currentOrderId = 1;
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize home templates
    const templates: HomeTemplate[] = [
      { id: this.currentTemplateId++, name: "Ravello", basePrice: "631995.00", baseCost: "500000.00" },
      { id: this.currentTemplateId++, name: "Sorrento", basePrice: "614995.00", baseCost: "485000.00" },
      { id: this.currentTemplateId++, name: "Verona", basePrice: "609995.00", baseCost: "475000.00" },
    ];

    templates.forEach(template => {
      this.homeTemplatesMap.set(template.id, template);
    });

    // Initialize upgrades based on the provided data
    const upgradeData: Upgrade[] = [
      {
        id: this.currentUpgradeId++,
        selectionId: "52896048",
        choiceId: "20673159",
        parentSelection: "(19) Kitchen Faucet",
        choiceTitle: "Upgrade to Artifacts Touchless (Vibrant Polished Chrome)",
        category: "Plumbing Trim Options",
        location: "Kitchen",
        builderCost: "1108.00",
        clientPrice: "1404.00",
        margin: "21.08"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896048",
        choiceId: "20673158",
        parentSelection: "(19) Kitchen Faucet",
        choiceTitle: "Upgrade to Artifacts Pulldown (Vibrant Stainless)",
        category: "Plumbing Trim Options",
        location: "Kitchen",
        builderCost: "619.00",
        clientPrice: "731.00",
        margin: "15.32"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896048",
        choiceId: "20673157",
        parentSelection: "(19) Kitchen Faucet",
        choiceTitle: "Upgrade to Artifacts Touchless (Vibrant Stainless)",
        category: "Plumbing Trim Options",
        location: "Kitchen",
        builderCost: "1013.00",
        clientPrice: "1120.00",
        margin: "9.55"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896048",
        choiceId: "20673156",
        parentSelection: "(19) Kitchen Faucet",
        choiceTitle: "Upgrade to Artifacts Touchless (Vibrant Brushed Bronze)",
        category: "Plumbing Trim Options",
        location: "Kitchen",
        builderCost: "922.00",
        clientPrice: "897.00",
        margin: "-2.79"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896048",
        choiceId: "20673155",
        parentSelection: "(19) Kitchen Faucet",
        choiceTitle: "Upgrade to Cruë Touchless (Vibrant Brushed Bronze)",
        category: "Plumbing Trim Options",
        location: "Kitchen",
        builderCost: "881.00",
        clientPrice: "1495.00",
        margin: "41.07"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896048",
        choiceId: "20673154",
        parentSelection: "(19) Kitchen Faucet",
        choiceTitle: "Upgrade to Cruë Pulldown (Matte Black)",
        category: "Plumbing Trim Options",
        location: "Kitchen",
        builderCost: "547.00",
        clientPrice: "1043.00",
        margin: "47.55"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896048",
        choiceId: "20673153",
        parentSelection: "(19) Kitchen Faucet",
        choiceTitle: "Upgrade to Cruë Touchless (Matte Black)",
        category: "Plumbing Trim Options",
        location: "Kitchen",
        builderCost: "802.00",
        clientPrice: "1370.00",
        margin: "41.46"
      }
    ];

    upgradeData.forEach(upgrade => {
      this.upgradesMap.set(upgrade.id, upgrade);
    });
  }

  async getHomeTemplates(): Promise<HomeTemplate[]> {
    return Array.from(this.homeTemplatesMap.values());
  }

  async getHomeTemplate(id: number): Promise<HomeTemplate | undefined> {
    return this.homeTemplatesMap.get(id);
  }

  async updateHomeTemplate(id: number, template: Partial<InsertHomeTemplate>): Promise<HomeTemplate | undefined> {
    const existing = this.homeTemplatesMap.get(id);
    if (!existing) return undefined;

    const updated: HomeTemplate = { ...existing, ...template };
    this.homeTemplatesMap.set(id, updated);
    return updated;
  }

  async getUpgrades(): Promise<Upgrade[]> {
    return Array.from(this.upgradesMap.values());
  }

  async getUpgradesByCategory(category: string): Promise<Upgrade[]> {
    return Array.from(this.upgradesMap.values()).filter(upgrade => upgrade.category === category);
  }

  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const id = this.currentOrderId++;
    const newOrder: PurchaseOrder = { 
      ...order, 
      id,
      selectedUpgrades: order.selectedUpgrades || null,
      lotPremium: order.lotPremium || "0.00"
    };
    this.purchaseOrdersMap.set(id, newOrder);
    return newOrder;
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrdersMap.values());
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    return this.purchaseOrdersMap.get(id);
  }
}

export const storage = new MemStorage();
