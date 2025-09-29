import "dotenv/config";
import fs from "fs";
import path from "path";

/**
 * Add a new home template via the existing API
 * 
 * This approach uses the existing PATCH endpoint to update templates
 * or you can extend the API to support POST for new templates
 */

interface TemplateData {
  name: string;
  basePrice: string;
  baseCost: string;
  beds: string;
  baths: string;
  garage: string;
  sqft: number;
  imageFile?: string; // filename in attached_assets/
}

async function addTemplateViaAPI(templateData: TemplateData) {
  try {
    console.log(`Adding template via API: ${templateData.name}...`);
    
    // Prepare the image URL if provided
    let imageUrl = "";
    
    if (templateData.imageFile) {
      const imagePath = path.join(process.cwd(), 'attached_assets', templateData.imageFile);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      
      imageUrl = `/attached_assets/${templateData.imageFile}`;
      console.log(`✅ Using image: ${templateData.imageFile}`);
    }
    
    // Prepare the template data
    const payload = {
      name: templateData.name,
      basePrice: templateData.basePrice,
      baseCost: templateData.baseCost,
      beds: templateData.beds,
      baths: templateData.baths,
      garage: templateData.garage,
      sqft: templateData.sqft,
      imageUrl: imageUrl,
    };
    
    // Make API call to add template
    const response = await fetch('http://localhost:8084/api/templates', {
      method: 'POST', // You'll need to add this endpoint
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Template added successfully via API!`);
    console.log(`Template ID: ${result.id}`);
    console.log(`Name: ${result.name}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to add template via API:', error);
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

// Example usage:
/*
async function example() {
  try {
    await addTemplateViaAPI({
      name: "API Template",
      basePrice: "650000",
      baseCost: "520000",
      beds: "3 Beds",
      baths: "2.5 Baths",
      garage: "2 Car Garage",
      sqft: 2100,
      imageFile: "APITemplate.webp"
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
*/

export { addTemplateViaAPI };
