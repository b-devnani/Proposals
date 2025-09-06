import "dotenv/config";
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
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

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

export class MemStorage implements IStorage { //deprecated
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
      { id: this.currentTemplateId++, name: "Ravello", basePrice: "630990", baseCost: "500000" },
      { id: this.currentTemplateId++, name: "Sorrento", basePrice: "614990", baseCost: "485000" },
      { id: this.currentTemplateId++, name: "Verona", basePrice: "609990", baseCost: "475000" },
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

export class DatabaseStorage implements IStorage {
  private db: any;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;
    
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    try {
      // Use regular PostgreSQL connection pool
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      this.db = drizzle(pool);
      this.initialized = true;
      console.log("🚀 DATABASE STORAGE: Database connection created!");
    } catch (error) {
      console.error("🚀 DATABASE STORAGE: Database connection failed:", error);
      throw error;
    }
  }

  async getHomeTemplates(): Promise<HomeTemplate[]> {    
    try {
      return await this.db.select().from(homeTemplates);
    } catch (error: any) {
      console.error("DATABASE STORAGE: Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail
      });
      throw error;
    }
  }

  async getHomeTemplate(id: number): Promise<HomeTemplate | undefined> {
    const result = await this.db.select().from(homeTemplates).where(eq(homeTemplates.id, id));
    return result[0];
  }

  async updateHomeTemplate(id: number, template: Partial<InsertHomeTemplate>): Promise<HomeTemplate | undefined> {
    const result = await this.db
      .update(homeTemplates)
      .set(template)
      .where(eq(homeTemplates.id, id))
      .returning();
    return result[0];
  }

  async getUpgrades(): Promise<Upgrade[]> {
    return await this.db.select().from(upgrades);
  }

  async getUpgradesByCategory(category: string): Promise<Upgrade[]> {
    return await this.db.select().from(upgrades).where(eq(upgrades.category, category));
  }

  async getUpgradesByTemplate(templateName: string): Promise<Upgrade[]> {    // For now, return all upgrades. You can implement template-specific logic later
    return await this.db.select().from(upgrades);
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const result = await this.db
      .insert(proposals)
      .values(proposal)
      .returning();
    return result[0];
  }

  async getProposals(): Promise<Proposal[]> {
    return await this.db.select().from(proposals);
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    const result = await this.db.select().from(proposals).where(eq(proposals.id, id));
    return result[0];
  }
}

export const storage = new DatabaseStorage()
