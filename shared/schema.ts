import { pgTable, text, serial, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const homeTemplates = pgTable("home_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  baseCost: decimal("base_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
});

export const upgrades = pgTable("upgrades", {
  id: serial("id").primaryKey(),
  selectionId: text("selection_id").notNull(),
  choiceId: text("choice_id").notNull(),
  parentSelection: text("parent_selection"),
  choiceTitle: text("choice_title").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  builderCost: decimal("builder_cost", { precision: 10, scale: 2 }).notNull(),
  clientPrice: decimal("client_price", { precision: 10, scale: 2 }).notNull(),
  margin: decimal("margin", { precision: 5, scale: 2 }).notNull(),
});

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  todaysDate: text("todays_date").notNull(),
  buyerLastName: text("buyer_last_name").notNull(),
  community: text("community").notNull(),
  lotNumber: text("lot_number").notNull(),
  lotAddress: text("lot_address").notNull(),
  housePlan: text("house_plan").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  lotPremium: decimal("lot_premium", { precision: 10, scale: 2 }).notNull().default("0.00"),
  selectedUpgrades: text("selected_upgrades").array(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const insertHomeTemplateSchema = createInsertSchema(homeTemplates).omit({
  id: true,
});

export const insertUpgradeSchema = createInsertSchema(upgrades).omit({
  id: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
});

export type HomeTemplate = typeof homeTemplates.$inferSelect;
export type InsertHomeTemplate = z.infer<typeof insertHomeTemplateSchema>;
export type Upgrade = typeof upgrades.$inferSelect;
export type InsertUpgrade = z.infer<typeof insertUpgradeSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
