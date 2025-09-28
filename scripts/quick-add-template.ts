#!/usr/bin/env npx tsx

import "dotenv/config";
import { addTemplateWithImage } from "./add-template-with-image";

/**
 * Quick script to add a new home template with image
 * 
 * Usage:
 * npx tsx scripts/quick-add-template.ts
 * 
 * Then follow the prompts to enter template details
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function quickAddTemplate() {
  try {
    console.log('🏠 Add New Home Template\n');
    
    const name = await question('Template name: ');
    const basePrice = await question('Base price (e.g., 650000): ');
    const baseCost = await question('Base cost (e.g., 520000): ');
    const beds = await question('Beds (e.g., "3 Beds"): ');
    const baths = await question('Baths (e.g., "2.5 Baths"): ');
    const garage = await question('Garage (e.g., "2 Car Garage"): ');
    const sqft = await question('Square footage (e.g., 2100): ');
    
    console.log('\n📸 Image options:');
    console.log('1. From attached_assets folder (recommended)');
    console.log('2. From system file path');
    console.log('3. Skip image (add later)');
    
    const imageChoice = await question('Choose image option (1-3): ');
    
    let templateData: any = {
      name,
      basePrice,
      baseCost,
      beds,
      baths,
      garage,
      sqft: parseInt(sqft),
    };
    
    if (imageChoice === '1') {
      const imageFile = await question('Image should be in attached_assets folder, only type the name (e.g., NewTemplate.webp): ');
      templateData.imageFile = imageFile;
    } else if (imageChoice === '2') {
      const imagePath = await question('Full path to image file: ');
      templateData.imagePath = imagePath;
    }
    // If choice is 3, no image data is added
    
    console.log('\n⏳ Adding template...');
    
    const result = await addTemplateWithImage(templateData);
    
    console.log('\n🎉 Template added successfully!');
    console.log(`Template ID: ${result.id}`);
    console.log(`Name: ${result.name}`);
    console.log(`Base Price: $${parseInt(result.basePrice).toLocaleString()}`);
    
  } catch (error) {
    console.error('\n❌ Error adding template:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

quickAddTemplate();
