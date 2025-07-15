import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProposalSchema, insertHomeTemplateSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Home Templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getHomeTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getHomeTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertHomeTemplateSchema.partial().parse(req.body);
      const updated = await storage.updateHomeTemplate(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  // Upgrades
  app.get("/api/upgrades", async (req, res) => {
    try {
      const template = req.query.template as string;
      if (template) {
        const upgrades = await storage.getUpgradesByTemplate(template);
        res.json(upgrades);
      } else {
        const upgrades = await storage.getUpgrades();
        res.json(upgrades);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upgrades" });
    }
  });

  app.get("/api/upgrades/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const upgrades = await storage.getUpgradesByCategory(category);
      res.json(upgrades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upgrades by category" });
    }
  });

  // Proposals
  app.post("/api/proposals", async (req, res) => {
    try {
      const proposalData = insertProposalSchema.parse(req.body);
      const proposal = await storage.createProposal(proposalData);
      res.status(201).json(proposal);
    } catch (error) {
      res.status(400).json({ message: "Invalid proposal data" });
    }
  });

  app.get("/api/proposals", async (req, res) => {
    try {
      const proposals = await storage.getProposals();
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.json(proposal);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
