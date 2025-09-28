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

  app.post("/api/templates", async (req, res) => {
    try {
      const templateData = insertHomeTemplateSchema.parse(req.body);
      const newTemplate = await storage.createHomeTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data" });
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

  // Serve template images from database
  app.get("/api/templates/:id/image", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getHomeTemplate(templateId);
      
      if (!template || !template.imageData) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(template.imageData, 'base64');
      
      // Set appropriate headers
      res.set({
        'Content-Type': template.imageMimeType || 'image/webp',
        'Content-Length': imageBuffer.length,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      });
      
      res.send(imageBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch image" });
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

  app.get("/api/proposals/archived", async (req, res) => {
    try {
      const proposals = await storage.getArchivedProposals();
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch archived proposals" });
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

  app.patch("/api/proposals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertProposalSchema.partial().parse(req.body);
      const updated = await storage.updateProposal(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Invalid proposal data" });
    }
  });

  app.patch("/api/proposals/:id/archive", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.archiveProposal(id);
      if (!updated) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to archive proposal" });
    }
  });

  app.patch("/api/proposals/:id/unarchive", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.unarchiveProposal(id);
      if (!updated) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to unarchive proposal" });
    }
  });

  // Special Requests routes
  app.get("/api/proposals/:id/special-requests", async (req, res) => {
    try {
      const proposalId = parseInt(req.params.id);
      const specialRequests = await storage.getSpecialRequests(proposalId);
      res.json(specialRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch special requests" });
    }
  });

  // Communities routes
  app.get("/api/communities", async (_req, res) => {
    try {
      const communities = await storage.getCommunities();
      res.json(communities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch communities" });
    }
  });

  app.get("/api/communities/:slug/lots", async (req, res) => {
    try {
      const slug = req.params.slug;
      const lots = await storage.getLotsByCommunitySlug(slug);
      res.json(lots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lots" });
    }
  });

  app.post("/api/special-requests", async (req, res) => {
    try {
      const specialRequest = await storage.createSpecialRequest(req.body);
      res.status(201).json(specialRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to create special request" });
    }
  });

  app.patch("/api/special-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const specialRequest = await storage.updateSpecialRequest(id, req.body);
      if (!specialRequest) {
        return res.status(404).json({ message: "Special request not found" });
      }
      res.json(specialRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update special request" });
    }
  });

  app.delete("/api/special-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSpecialRequest(id);
      if (!success) {
        return res.status(404).json({ message: "Special request not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete special request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
