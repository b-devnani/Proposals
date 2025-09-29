import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { homeTemplates } from "../shared/schema.js";
import fs from "fs";
import path from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

/**
 * Add a new home template with image to the database
 * 
 * Images are now stored as files in the attached_assets folder instead of base64 in the database.
 * 
 * Usage examples:
 * 
 * 1. From a file already in attached_assets folder:
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
 * 2. From a file path (will copy to attached_assets folder):
 *    await addTemplateWithImage({
 *      name: "New Template",
 *      basePrice: "650000",
 *      baseCost: "520000", 
 *      beds: "3 Beds",
 *      baths: "2.5 Baths",
 *      garage: "2 Car Garage",
 *      sqft: 2100,
 *      imagePath: "/path/to/your/image.webp" // full system path - will be copied
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
  // Image file to copy to attached_assets folder:
  imageFile?: string; // filename to use in attached_assets/ folder
  imagePath?: string; // full system path to image file to copy
}

async function addTemplateWithImage(templateData: TemplateData) {
  try {
    console.log(`Adding template: ${templateData.name}...`);
    
    let imageUrl = "";
    
    // Handle image file copying to attached_assets folder
    if (templateData.imagePath) {
      // Copy image from source path to attached_assets folder
      const sourcePath = templateData.imagePath;
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Image file not found: ${sourcePath}`);
      }
      
      // Generate a unique filename based on template name and timestamp
      const timestamp = Date.now();
      const ext = path.extname(sourcePath);
      const filename = `${templateData.name.replace(/\s+/g, '_')}_${timestamp}${ext}`;
      const destPath = path.join(process.cwd(), 'attached_assets', filename);
      
      // Copy the file
      fs.copyFileSync(sourcePath, destPath);
      
      // Set the image URL
      imageUrl = `/attached_assets/${filename}`;
      
      console.log(`✅ Copied image from ${sourcePath} to ${destPath}`);
      
    } else if (templateData.imageFile) {
      // Image file is already in attached_assets folder
      const imagePath = path.join(process.cwd(), 'attached_assets', templateData.imageFile);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      
      imageUrl = `/attached_assets/${templateData.imageFile}`;
      console.log(`✅ Using existing image file: ${templateData.imageFile}`);
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
        imageUrl: imageUrl,
      })
      .returning();
    
    if (result.length > 0) {
      const template = result[0];
      console.log(`✅ Successfully added template "${template.name}" with ID ${template.id}`);
      console.log(`   Image URL: ${imageUrl || 'No image'}`);
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
