import { 
  homeTemplates, 
  type HomeTemplate, 
  type InsertHomeTemplate,
  upgrades,
  type Upgrade,
  type InsertUpgrade,
  proposals,
  type Proposal,
  type InsertProposal
} from "@shared/schema";

export interface IStorage {
  // Home Templates
  getHomeTemplates(): Promise<HomeTemplate[]>;
  getHomeTemplate(id: number): Promise<HomeTemplate | undefined>;
  updateHomeTemplate(id: number, template: Partial<InsertHomeTemplate>): Promise<HomeTemplate | undefined>;
  
  // Upgrades
  getUpgrades(): Promise<Upgrade[]>;
  getUpgradesByCategory(category: string): Promise<Upgrade[]>;
  
  // Proposals
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  getProposals(): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
}

export class MemStorage implements IStorage {
  private homeTemplatesMap: Map<number, HomeTemplate>;
  private upgradesMap: Map<number, Upgrade>;
  private proposalsMap: Map<number, Proposal>;
  private currentTemplateId: number;
  private currentUpgradeId: number;
  private currentProposalId: number;

  constructor() {
    this.homeTemplatesMap = new Map();
    this.upgradesMap = new Map();
    this.proposalsMap = new Map();
    this.currentTemplateId = 1;
    this.currentUpgradeId = 1;
    this.currentProposalId = 1;
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize home templates
    const templates: HomeTemplate[] = [
      { id: this.currentTemplateId++, name: "Ravello", basePrice: "631995", baseCost: "500000" },
      { id: this.currentTemplateId++, name: "Sorrento", basePrice: "614995", baseCost: "485000" },
      { id: this.currentTemplateId++, name: "Verona", basePrice: "609995", baseCost: "475000" },
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
        builderCost: "1108",
        clientPrice: "1404",
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
        builderCost: "619",
        clientPrice: "731",
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
        builderCost: "1013",
        clientPrice: "1120",
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
        builderCost: "922",
        clientPrice: "897",
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
        builderCost: "881",
        clientPrice: "1495",
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
        builderCost: "547",
        clientPrice: "1043",
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
        builderCost: "802",
        clientPrice: "1370",
        margin: "41.46"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896049",
        choiceId: "20673200",
        parentSelection: "(20) Master Bath Vanity",
        choiceTitle: "Upgrade to Quartz Countertop (Calacatta)",
        category: "Countertops",
        location: "Master Bath",
        builderCost: "1200",
        clientPrice: "1650",
        margin: "27.27"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896050",
        choiceId: "20673201",
        parentSelection: "(21) Kitchen Island",
        choiceTitle: "Upgrade to Granite Countertop (Black Pearl)",
        category: "Countertops",
        location: "Kitchen",
        builderCost: "890",
        clientPrice: "1245",
        margin: "28.51"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896051",
        choiceId: "20673202",
        parentSelection: "(22) Flooring",
        choiceTitle: "Upgrade to Hardwood Flooring (Oak)",
        category: "Flooring",
        location: "Living Room",
        builderCost: "2800",
        clientPrice: "3500",
        margin: "20.00"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896052",
        choiceId: "20673203",
        parentSelection: "(23) Bathroom Tile",
        choiceTitle: "Upgrade to Porcelain Tile (Marble Look)",
        category: "Flooring",
        location: "Guest Bath",
        builderCost: "1100",
        clientPrice: "1450",
        margin: "24.14"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896053",
        choiceId: "20673204",
        parentSelection: "(24) Light Fixtures",
        choiceTitle: "Upgrade to Designer Chandelier",
        category: "Electrical",
        location: "Dining Room",
        builderCost: "650",
        clientPrice: "950",
        margin: "31.58"
      },
      {
        id: this.currentUpgradeId++,
        selectionId: "52896054",
        choiceId: "20673205",
        parentSelection: "(25) Ceiling Fans",
        choiceTitle: "Upgrade to Smart Ceiling Fans",
        category: "Electrical",
        location: "Bedrooms",
        builderCost: "425",
        clientPrice: "625",
        margin: "32.00"
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

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const id = this.currentProposalId++;
    const newProposal: Proposal = { 
      ...proposal, 
      id,
      selectedUpgrades: proposal.selectedUpgrades || null,
      lotPremium: proposal.lotPremium || "0"
    };
    this.proposalsMap.set(id, newProposal);
    return newProposal;
  }

  async getProposals(): Promise<Proposal[]> {
    return Array.from(this.proposalsMap.values());
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    return this.proposalsMap.get(id);
  }
}

export const storage = new MemStorage();
