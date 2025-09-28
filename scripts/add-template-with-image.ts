import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { homeTemplates } from "@shared/schema";
import fs from "fs";
import path from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

/**
 * Add a new home template with image to the database
 * 
 * Usage examples:
 * 
 * 1. From a file in attached_assets folder:
 *    await addTemplateWithImage({
 *      name: "New Template",
 *      basePrice: "650000",
 *      baseCost: "520000",
 *      beds: "3 Beds",
 *      baths: "2.5 Baths", 
 *      garage: "2 Car Garage",
 *      sqft: 2100,
 *      imageFile: "NewTemplate_1234567890.webp" // file in attached_assets/
 *    });
 * 
 * 2. From a base64 string (if you already have the image data):
 *    await addTemplateWithImage({
 *      name: "New Template",
 *      basePrice: "650000",
 *      baseCost: "520000", 
 *      beds: "3 Beds",
 *      baths: "2.5 Baths",
 *      garage: "2 Car Garage",
 *      sqft: 2100,
 *      imageBase64: "data:image/webp;base64,/9j/4AAQSkZJRgABAQAAAQ...", // full data URL
 *      mimeType: "image/webp"
 *    });
 * 
 * 3. From a file path anywhere on your system:
 *    await addTemplateWithImage({
 *      name: "New Template", 
 *      basePrice: "650000",
 *      baseCost: "520000",
 *      beds: "3 Beds",
 *      baths: "2.5 Baths",
 *      garage: "2 Car Garage", 
 *      sqft: 2100,
 *      imagePath: "/path/to/your/image.webp" // full system path
 *    });
 */

interface TemplateData {
  name: string;
  basePrice: string;
  baseCost: string;
  beds: string;
  baths: string;
  garage: string;
  sqft: number;
  // One of these image options:
  imageFile?: string; // filename in attached_assets/ folder
  imageBase64?: string; // full data URL or base64 string
  imagePath?: string; // full system path to image file
  mimeType?: string; // MIME type (auto-detected from file extension if not provided)
}

async function addTemplateWithImage(templateData: TemplateData) {
  try {
    console.log(`Adding template: ${templateData.name}...`);
    
    let imageData: string | null = null;
    let mimeType = templateData.mimeType || "image/webp";
    
    // Handle different image input methods
    if (templateData.imageFile) {
      // From attached_assets folder
      const imagePath = path.join(process.cwd(), 'attached_assets', templateData.imageFile);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      
      const imageBuffer = fs.readFileSync(imagePath);
      imageData = imageBuffer.toString('base64');
      mimeType = getMimeTypeFromFile(templateData.imageFile);
      
      console.log(`✅ Loaded image from attached_assets: ${templateData.imageFile}`);
      
    } else if (templateData.imageBase64) {
      // From base64 string
      if (templateData.imageBase64.startsWith('data:')) {
        // Extract base64 from data URL
        const [header, base64] = templateData.imageBase64.split(',');
        imageData = base64;
        mimeType = header.split(';')[0].split(':')[1];
      } else {
        // Pure base64 string
        imageData = templateData.imageBase64;
      }
      
      console.log(`✅ Using provided base64 image data`);
      
    } else if (templateData.imagePath) {
      // From system path
      if (!fs.existsSync(templateData.imagePath)) {
        throw new Error(`Image file not found: ${templateData.imagePath}`);
      }
      
      const imageBuffer = fs.readFileSync(templateData.imagePath);
      imageData = imageBuffer.toString('base64');
      mimeType = getMimeTypeFromFile(templateData.imagePath);
      
      console.log(`✅ Loaded image from path: ${templateData.imagePath}`);
    }
    
    // Insert the template into database
    const result = await db
      .insert(homeTemplates)
      .values({
        name: templateData.name,
        basePrice: templateData.basePrice,
        baseCost: templateData.baseCost,
        beds: templateData.beds,
        baths: templateData.baths,
        garage: templateData.garage,
        sqft: templateData.sqft,
        imageData: imageData,
        imageMimeType: mimeType,
        imageUrl: "", // Keep empty since we're using database storage
      })
      .returning();
    
    if (result.length > 0) {
      const template = result[0];
      console.log(`✅ Successfully added template "${template.name}" with ID ${template.id}`);
      console.log(`   Image data size: ${imageData ? imageData.length : 0} characters`);
      console.log(`   MIME type: ${mimeType}`);
      return template;
    } else {
      throw new Error("Failed to insert template");
    }
    
  } catch (error) {
    console.error('❌ Failed to add template:', error);
    throw error;
  }
}

function getMimeTypeFromFile(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.webp': return 'image/webp';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    default: return 'image/webp';
  }
}

// Example usage - uncomment and modify as needed:
/*
async function example() {
  try {
    // Example 1: Add template with image from attached_assets folder
    await addTemplateWithImage({
      name: "Example Template",
      basePrice: "650000",
      baseCost: "520000",
      beds: "3 Beds",
      baths: "2.5 Baths",
      garage: "2 Car Garage",
      sqft: 2100,
      imageFile: "ExampleTemplate.webp" // Put this file in attached_assets/ folder
    });
    
    console.log('Template added successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// Uncomment to run the example:
// example();
*/

export { addTemplateWithImage };

// Keep the connection open for interactive use
// Don't close the pool automatically
