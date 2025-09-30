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
  type InsertProposal,
  specialRequests,
  type SpecialRequest,
  type InsertSpecialRequest,
  communities,
  type Community,
  type InsertCommunity,
  lots,
  type Lot,
  type InsertLot,
} from "@shared/schema";
import { getHomeTemplateUpgrades } from "./excel-import.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { desc, eq, like } from "drizzle-orm";
import { Pool } from "pg";

export interface IStorage {
  // Home Templates
  getHomeTemplates(): Promise<HomeTemplate[]>;
  getHomeTemplate(id: number): Promise<HomeTemplate | undefined>;
  createHomeTemplate(template: InsertHomeTemplate): Promise<HomeTemplate>;
  updateHomeTemplate(
    id: number,
    template: Partial<InsertHomeTemplate>,
  ): Promise<HomeTemplate | undefined>;

  // Upgrades
  getUpgrades(): Promise<Upgrade[]>;
  getUpgradesByCategory(category: string): Promise<Upgrade[]>;
  getUpgradesByTemplate(templateName: string): Promise<Upgrade[]>;

  // Proposals
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  getProposals(): Promise<Proposal[]>;
  getArchivedProposals(): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
  updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;
  archiveProposal(id: number): Promise<Proposal | undefined>;
  unarchiveProposal(id: number): Promise<Proposal | undefined>;
  duplicateProposal(id: number): Promise<Proposal | undefined>;
  
  // Special Requests
  getSpecialRequests(proposalId: number): Promise<SpecialRequest[]>;
  createSpecialRequest(specialRequest: InsertSpecialRequest): Promise<SpecialRequest>;
  updateSpecialRequest(id: number, specialRequest: Partial<InsertSpecialRequest>): Promise<SpecialRequest | undefined>;
  deleteSpecialRequest(id: number): Promise<boolean>;

  // Communities
  getCommunities(): Promise<Community[]>;
  getCommunity(id: number): Promise<Community | undefined>;
  getCommunityBySlug(slug: string): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: number, community: Partial<InsertCommunity>): Promise<Community | undefined>;

  // Lots
  getLots(): Promise<Lot[]>;
  getLotsByCommunity(communityId: number): Promise<Lot[]>;
  getLotsByCommunitySlug(communitySlug: string): Promise<Lot[]>;
  getLot(id: number): Promise<Lot | undefined>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: number, lot: Partial<InsertLot>): Promise<Lot | undefined>;
}

export class MemStorage implements IStorage {
  //deprecated
  private homeTemplatesMap: Map<number, HomeTemplate>;
  private upgradesMap: Map<string, Upgrade>;
  private proposalsMap: Map<number, Proposal>;
  private specialRequestsMap: Map<number, SpecialRequest>;
  private communitiesMap: Map<number, Community>;
  private lotsMap: Map<number, Lot>;
  private templateUpgradesCache: Map<string, Upgrade[]>;
  private currentTemplateId: number;
  private currentUpgradeId: number;
  private currentProposalId: number;
  private currentSpecialRequestId: number;
  private currentCommunityId: number;
  private currentLotId: number;

  constructor() {
    this.homeTemplatesMap = new Map();
    this.upgradesMap = new Map();
    this.proposalsMap = new Map();
    this.specialRequestsMap = new Map();
    this.communitiesMap = new Map();
    this.lotsMap = new Map();
    this.templateUpgradesCache = new Map();
    this.currentTemplateId = 1;
    this.currentUpgradeId = 1;
    this.currentProposalId = 1;
    this.currentSpecialRequestId = 1;
    this.currentCommunityId = 1;
    this.currentLotId = 1;

    this.initializeData();
  }

  private initializeData() {
    // Initialize home templates
    const templates: HomeTemplate[] = [
      {
        id: this.currentTemplateId++,
        name: "Ravello",
        basePrice: "630990",
        baseCost: "500000",
        beds: "4 Beds",
        baths: "3 Baths",
        garage: "2 Car Garage",
        sqft: 2184,
        imageUrl: "/attached_assets/Ravello_1754950998192.webp",
      },
      {
        id: this.currentTemplateId++,
        name: "Sorrento",
        basePrice: "614990",
        baseCost: "485000",
        beds: "2 Beds",
        baths: "2 Baths",
        garage: "2 Car Garage",
        sqft: 2002,
        imageUrl: "/attached_assets/Sorrento_1754950998192.webp",
      },
      {
        id: this.currentTemplateId++,
        name: "Verona",
        basePrice: "609990",
        baseCost: "475000",
        beds: "2 Beds",
        baths: "2 Baths",
        garage: "2 Car Garage",
        sqft: 1987,
        imageUrl: "/attached_assets/Verona_1754950998191.webp",
      },
    ];

    templates.forEach((template) => {
      this.homeTemplatesMap.set(template.id, template);
    });

    // Load Sorrento upgrades from Excel file
    const sorrentoUpgrades = getHomeTemplateUpgrades("Sorrento");
    this.templateUpgradesCache.set("Sorrento", sorrentoUpgrades);

    // Initialize default upgrades map with Sorrento data
    const upgradeData: Upgrade[] = sorrentoUpgrades;

    upgradeData.forEach((upgrade) => {
      this.upgradesMap.set(upgrade.id, upgrade);
    });
  }

  async getHomeTemplates(): Promise<HomeTemplate[]> {
    return Array.from(this.homeTemplatesMap.values());
  }

  async getHomeTemplate(id: number): Promise<HomeTemplate | undefined> {
    return this.homeTemplatesMap.get(id);
  }

  async createHomeTemplate(template: InsertHomeTemplate): Promise<HomeTemplate> {
    const id = this.currentTemplateId++;
    const newTemplate: HomeTemplate = {
      ...template,
      id,
      baseCost: template.baseCost || "0.00",
      beds: template.beds || "",
      baths: template.baths || "",
      garage: template.garage || "",
      sqft: template.sqft || 0,
      imageUrl: template.imageUrl || "",
    };
    this.homeTemplatesMap.set(id, newTemplate);
    return newTemplate;
  }

  async updateHomeTemplate(
    id: number,
    template: Partial<InsertHomeTemplate>,
  ): Promise<HomeTemplate | undefined> {
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
    return Array.from(this.upgradesMap.values()).filter(
      (upgrade) => upgrade.category === category,
    );
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
      lotPremium: proposal.lotPremium || "0",
      salesIncentive: proposal.salesIncentive || null,
      designAllowance: proposal.designAllowance || null,
      archived: false,
    };
    this.proposalsMap.set(id, newProposal);
    return newProposal;
  }

  async getProposals(): Promise<Proposal[]> {
    return Array.from(this.proposalsMap.values())
      .filter(proposal => !proposal.archived)
      .sort((a, b) => b.id - a.id);
  }

  async getArchivedProposals(): Promise<Proposal[]> {
    return Array.from(this.proposalsMap.values())
      .filter(proposal => proposal.archived)
      .sort((a, b) => b.id - a.id);
  }

  async archiveProposal(id: number): Promise<Proposal | undefined> {
    const existing = this.proposalsMap.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, archived: true };
    this.proposalsMap.set(id, updated);
    return updated;
  }

  async unarchiveProposal(id: number): Promise<Proposal | undefined> {
    const existing = this.proposalsMap.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, archived: false };
    this.proposalsMap.set(id, updated);
    return updated;
  }

  // Special Requests
  async getSpecialRequests(proposalId: number): Promise<SpecialRequest[]> {
    return Array.from(this.specialRequestsMap.values())
      .filter(sr => sr.proposalId === proposalId);
  }

  async createSpecialRequest(specialRequest: InsertSpecialRequest): Promise<SpecialRequest> {
    const id = this.currentSpecialRequestId++;
    const newSpecialRequest: SpecialRequest = {
      ...specialRequest,
      id,
      builderCost: specialRequest.builderCost || "0.00",
      clientPrice: specialRequest.clientPrice || "0.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.specialRequestsMap.set(id, newSpecialRequest);
    return newSpecialRequest;
  }

  async updateSpecialRequest(id: number, specialRequest: Partial<InsertSpecialRequest>): Promise<SpecialRequest | undefined> {
    const existing = this.specialRequestsMap.get(id);
    if (!existing) return undefined;
    
    const updated = { 
      ...existing, 
      ...specialRequest, 
      updatedAt: new Date() 
    };
    this.specialRequestsMap.set(id, updated);
    return updated;
  }

  async deleteSpecialRequest(id: number): Promise<boolean> {
    return this.specialRequestsMap.delete(id);
  }

  // Communities
  async getCommunities(): Promise<Community[]> {
    return Array.from(this.communitiesMap.values());
  }

  async getCommunity(id: number): Promise<Community | undefined> {
    return this.communitiesMap.get(id);
  }

  async getCommunityBySlug(slug: string): Promise<Community | undefined> {
    return Array.from(this.communitiesMap.values()).find(c => c.slug === slug);
  }

  async createCommunity(community: InsertCommunity): Promise<Community> {
    const id = this.currentCommunityId++;
    const newCommunity: Community = {
      ...community,
      id,
      isActive: community.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.communitiesMap.set(id, newCommunity);
    return newCommunity;
  }

  async updateCommunity(id: number, community: Partial<InsertCommunity>): Promise<Community | undefined> {
    const existing = this.communitiesMap.get(id);
    if (!existing) return undefined;

    const updated: Community = { 
      ...existing, 
      ...community, 
      updatedAt: new Date() 
    };
    this.communitiesMap.set(id, updated);
    return updated;
  }

  // Lots
  async getLots(): Promise<Lot[]> {
    return Array.from(this.lotsMap.values());
  }

  async getLotsByCommunity(communityId: number): Promise<Lot[]> {
    return Array.from(this.lotsMap.values()).filter(lot => lot.communityId === communityId);
  }

  async getLotsByCommunitySlug(communitySlug: string): Promise<Lot[]> {
    const community = await this.getCommunityBySlug(communitySlug);
    if (!community) return [];
    return this.getLotsByCommunity(community.id);
  }

  async getLot(id: number): Promise<Lot | undefined> {
    return this.lotsMap.get(id);
  }

  async createLot(lot: InsertLot): Promise<Lot> {
    const id = this.currentLotId++;
    const newLot: Lot = {
      ...lot,
      id,
      isAvailable: lot.isAvailable ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.lotsMap.set(id, newLot);
    return newLot;
  }

  async updateLot(id: number, lot: Partial<InsertLot>): Promise<Lot | undefined> {
    const existing = this.lotsMap.get(id);
    if (!existing) return undefined;

    const updated: Lot = { 
      ...existing, 
      ...lot, 
      updatedAt: new Date() 
    };
    this.lotsMap.set(id, updated);
    return updated;
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    return this.proposalsMap.get(id);
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const existing = this.proposalsMap.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...proposal };
    this.proposalsMap.set(id, updated);
    return updated;
  }

  async duplicateProposal(id: number): Promise<Proposal | undefined> {
    const existing = this.proposalsMap.get(id);
    if (!existing) return undefined;
    
    const newId = this.currentProposalId++;
    const duplicated: Proposal = {
      ...existing,
      id: newId,
      buyerLastName: `${existing.buyerLastName} (Copy)`,
      todaysDate: new Date().toLocaleDateString('en-US'),
    };
    this.proposalsMap.set(newId, duplicated);
    return duplicated;
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
          rejectUnauthorized: false,
        },
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
        detail: error.detail,
      });
      throw error;
    }
  }

  async getHomeTemplate(id: number): Promise<HomeTemplate | undefined> {
    const result = await this.db
      .select()
      .from(homeTemplates)
      .where(eq(homeTemplates.id, id));
    return result[0];
  }

  async createHomeTemplate(template: InsertHomeTemplate): Promise<HomeTemplate> {
    const result = await this.db
      .insert(homeTemplates)
      .values(template)
      .returning();
    return result[0];
  }

  async updateHomeTemplate(
    id: number,
    template: Partial<InsertHomeTemplate>,
  ): Promise<HomeTemplate | undefined> {
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
    return await this.db
      .select()
      .from(upgrades)
      .where(eq(upgrades.category, category));
  }

  async getUpgradesByTemplate(templateName: string): Promise<Upgrade[]> {
    // Filter upgrades by template using the template field
    return await this.db
      .select()
      .from(upgrades)
      .where(eq(upgrades.template, templateName));
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const result = await this.db.insert(proposals).values(proposal).returning();
    return result[0];
  }

  async getProposals(): Promise<Proposal[]> {
    return await this.db
      .select()
      .from(proposals)
      .where(eq(proposals.archived, false))
      .orderBy(desc(proposals.id));
  }

  async getArchivedProposals(): Promise<Proposal[]> {
    return await this.db
      .select()
      .from(proposals)
      .where(eq(proposals.archived, true))
      .orderBy(desc(proposals.id));
  }

  async archiveProposal(id: number): Promise<Proposal | undefined> {
    const result = await this.db
      .update(proposals)
      .set({ archived: true })
      .where(eq(proposals.id, id))
      .returning();
    return result[0];
  }

  async unarchiveProposal(id: number): Promise<Proposal | undefined> {
    const result = await this.db
      .update(proposals)
      .set({ archived: false })
      .where(eq(proposals.id, id))
      .returning();
    return result[0];
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    const result = await this.db
      .select()
      .from(proposals)
      .where(eq(proposals.id, id));
    return result[0];
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const result = await this.db
      .update(proposals)
      .set(proposal)
      .where(eq(proposals.id, id))
      .returning();
    return result[0];
  }

  async duplicateProposal(id: number): Promise<Proposal | undefined> {
    const original = await this.getProposal(id);
    if (!original) return undefined;

    const { id: _, ...proposalData } = original;
    const duplicated = await this.createProposal({
      ...proposalData,
      buyerLastName: `${original.buyerLastName} (Copy)`,
      todaysDate: new Date().toLocaleDateString('en-US'),
    });
    
    // Also duplicate special requests if any
    const specialRequests = await this.getSpecialRequests(id);
    for (const sr of specialRequests) {
      const { id: srId, proposalId: _, ...srData } = sr;
      await this.createSpecialRequest({
        ...srData,
        proposalId: duplicated.id,
      });
    }
    
    return duplicated;
  }

  // Special Requests
  async getSpecialRequests(proposalId: number): Promise<SpecialRequest[]> {
    return await this.db
      .select()
      .from(specialRequests)
      .where(eq(specialRequests.proposalId, proposalId))
      .orderBy(specialRequests.id);
  }

  async createSpecialRequest(specialRequest: InsertSpecialRequest): Promise<SpecialRequest> {
    const result = await this.db
      .insert(specialRequests)
      .values(specialRequest)
      .returning();
    return result[0];
  }

  async updateSpecialRequest(id: number, specialRequest: Partial<InsertSpecialRequest>): Promise<SpecialRequest | undefined> {
    const result = await this.db
      .update(specialRequests)
      .set({ ...specialRequest, updatedAt: new Date() })
      .where(eq(specialRequests.id, id))
      .returning();
    return result[0];
  }

  async deleteSpecialRequest(id: number): Promise<boolean> {
    const result = await this.db
      .delete(specialRequests)
      .where(eq(specialRequests.id, id))
      .returning();
    return result.length > 0;
  }

  // Communities
  async getCommunities(): Promise<Community[]> {
    return await this.db.select().from(communities).where(eq(communities.isActive, true));
  }

  async getCommunity(id: number): Promise<Community | undefined> {
    const result = await this.db
      .select()
      .from(communities)
      .where(eq(communities.id, id));
    return result[0];
  }

  async getCommunityBySlug(slug: string): Promise<Community | undefined> {
    const result = await this.db
      .select()
      .from(communities)
      .where(eq(communities.slug, slug));
    return result[0];
  }

  async createCommunity(community: InsertCommunity): Promise<Community> {
    const result = await this.db
      .insert(communities)
      .values(community)
      .returning();
    return result[0];
  }

  async updateCommunity(id: number, community: Partial<InsertCommunity>): Promise<Community | undefined> {
    const result = await this.db
      .update(communities)
      .set({ ...community, updatedAt: new Date() })
      .where(eq(communities.id, id))
      .returning();
    return result[0];
  }

  // Lots
  async getLots(): Promise<Lot[]> {
    return await this.db.select().from(lots).where(eq(lots.isAvailable, true));
  }

  async getLotsByCommunity(communityId: number): Promise<Lot[]> {
    return await this.db
      .select()
      .from(lots)
      .where(eq(lots.communityId, communityId))
      .orderBy(lots.lotNumber);
  }

  async getLotsByCommunitySlug(communitySlug: string): Promise<Lot[]> {
    const community = await this.getCommunityBySlug(communitySlug);
    if (!community) return [];
    return this.getLotsByCommunity(community.id);
  }

  async getLot(id: number): Promise<Lot | undefined> {
    const result = await this.db
      .select()
      .from(lots)
      .where(eq(lots.id, id));
    return result[0];
  }

  async createLot(lot: InsertLot): Promise<Lot> {
    const result = await this.db
      .insert(lots)
      .values(lot)
      .returning();
    return result[0];
  }

  async updateLot(id: number, lot: Partial<InsertLot>): Promise<Lot | undefined> {
    const result = await this.db
      .update(lots)
      .set({ ...lot, updatedAt: new Date() })
      .where(eq(lots.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
