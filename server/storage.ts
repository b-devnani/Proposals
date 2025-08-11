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
import { getHomeTemplateUpgrades } from "./excel-import.js";

export interface IStorage {
  // Home Templates
  getHomeTemplates(): Promise<HomeTemplate[]>;
  getHomeTemplate(id: number): Promise<HomeTemplate | undefined>;
  updateHomeTemplate(id: number, template: Partial<InsertHomeTemplate>): Promise<HomeTemplate | undefined>;
  
  // Upgrades
  getUpgrades(): Promise<Upgrade[]>;
  getUpgradesByCategory(category: string): Promise<Upgrade[]>;
  getUpgradesByTemplate(templateName: string): Promise<Upgrade[]>;
  
  // Proposals
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  getProposals(): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
}

export class MemStorage implements IStorage {
  private homeTemplatesMap: Map<number, HomeTemplate>;
  private upgradesMap: Map<number, Upgrade>;
  private proposalsMap: Map<number, Proposal>;
  private templateUpgradesCache: Map<string, Upgrade[]>;
  private currentTemplateId: number;
  private currentUpgradeId: number;
  private currentProposalId: number;

  constructor() {
    this.homeTemplatesMap = new Map();
    this.upgradesMap = new Map();
    this.proposalsMap = new Map();
    this.templateUpgradesCache = new Map();
    this.currentTemplateId = 1;
    this.currentUpgradeId = 1;
    this.currentProposalId = 1;
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize home templates
    const templates: HomeTemplate[] = [
      { id: this.currentTemplateId++, name: "Ravello", basePrice: "630995", baseCost: "500000" },
      { id: this.currentTemplateId++, name: "Sorrento", basePrice: "594990", baseCost: "485000" },
      { id: this.currentTemplateId++, name: "Verona", basePrice: "609995", baseCost: "475000" },
    ];

    templates.forEach(template => {
      this.homeTemplatesMap.set(template.id, template);
    });

    // Load Sorrento upgrades from Excel file
    const sorrentoUpgrades = getHomeTemplateUpgrades("Sorrento");
    this.templateUpgradesCache.set("Sorrento", sorrentoUpgrades);
    
    // Initialize default upgrades map with Sorrento data
    const upgradeData: Upgrade[] = sorrentoUpgrades;

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

  async getUpgradesByTemplate(templateName: string): Promise<Upgrade[]> {
    // Check cache first
    if (this.templateUpgradesCache.has(templateName)) {
      return this.templateUpgradesCache.get(templateName)!;
    }
    
    // Load from Excel file
    const upgrades = getHomeTemplateUpgrades(templateName);
    this.templateUpgradesCache.set(templateName, upgrades);
    return upgrades;
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
