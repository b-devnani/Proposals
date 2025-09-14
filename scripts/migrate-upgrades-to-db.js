import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";
import { upgrades } from "../shared/schema.ts";
import { readExcelUpgrades } from "../server/excel-import.ts";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool);

// Template to Excel file mapping
const templateFileMap = {
  'Sorrento': 'Sorrento Selections_Short List.xlsx',
  'Ravello': 'Ravello Selections.xlsx', 
  'Verona': 'Verona Selections.xlsx'
};

// Generate unique identifiers for upgrades
function generateUpgradeId(templateName, index) {
  return `${templateName.toLowerCase()}-${index + 1}`;
}

function generateSelectionId(templateName, parentSelection, index) {
  const cleanParent = parentSelection.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${templateName.toLowerCase()}-${cleanParent}-${index + 1}`;
}

function generateChoiceId(templateName, choiceTitle, index) {
  const cleanChoice = choiceTitle.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${templateName.toLowerCase()}-${cleanChoice}-${index + 1}`;
}

// Check if upgrade already exists
async function upgradeExists(templateName, selectionId, choiceId) {
  try {
    const result = await db.select()
      .from(upgrades)
      .where(and(
        eq(upgrades.selectionId, selectionId),
        eq(upgrades.choiceId, choiceId)
      ))
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error('Error checking if upgrade exists:', error);
    return false;
  }
}

// Insert upgrade into database
async function insertUpgrade(upgradeData) {
  try {
    const result = await db.insert(upgrades)
      .values(upgradeData)
      .returning();
    
    return result[0];
  } catch (error) {
    console.error('Error inserting upgrade:', error);
    throw error;
  }
}

// Migrate upgrades for a specific template
async function migrateTemplateUpgrades(templateName) {
  console.log(`\n🔄 Migrating upgrades for ${templateName}...`);
  
  const fileName = templateFileMap[templateName];
  if (!fileName) {
    console.warn(`❌ No Excel file found for template: ${templateName}`);
    return { success: 0, skipped: 0, errors: 0 };
  }

  try {
    // Read upgrades from Excel file
    const excelUpgrades = readExcelUpgrades(fileName);
    console.log(`📊 Found ${excelUpgrades.length} upgrades in ${fileName}`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < excelUpgrades.length; i++) {
      const excelUpgrade = excelUpgrades[i];
      
      try {
        // Generate unique identifiers
        const selectionId = generateSelectionId(templateName, excelUpgrade.parentSelection, i);
        const choiceId = generateChoiceId(templateName, excelUpgrade.choiceTitle, i);
        
        // Check if upgrade already exists
        const exists = await upgradeExists(templateName, selectionId, choiceId);
        
        if (exists) {
          console.log(`⏭️  Skipping existing upgrade: ${excelUpgrade.choiceTitle}`);
          skippedCount++;
          continue;
        }

        // Prepare upgrade data for database
        const upgradeData = {
          selectionId,
          choiceId,
          parentSelection: excelUpgrade.parentSelection,
          choiceTitle: excelUpgrade.choiceTitle,
          category: excelUpgrade.category,
          location: excelUpgrade.location,
          builderCost: excelUpgrade.builderCost,
          clientPrice: excelUpgrade.clientPrice,
          margin: excelUpgrade.margin
        };

        // Insert into database
        await insertUpgrade(upgradeData);
        console.log(`✅ Inserted: ${excelUpgrade.choiceTitle} (${excelUpgrade.category})`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing upgrade ${excelUpgrade.choiceTitle}:`, error.message);
        errorCount++;
      }
    }

    return { success: successCount, skipped: skippedCount, errors: errorCount };

  } catch (error) {
    console.error(`❌ Error reading Excel file for ${templateName}:`, error);
    return { success: 0, skipped: 0, errors: 1 };
  }
}

// Main migration function
async function migrateAllUpgrades() {
  console.log('🚀 Starting upgrade migration to database...');
  console.log('📋 This script is idempotent - safe to run multiple times');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');

    const templates = Object.keys(templateFileMap);
    const totalStats = { success: 0, skipped: 0, errors: 0 };

    // Migrate upgrades for each template
    for (const templateName of templates) {
      const stats = await migrateTemplateUpgrades(templateName);
      totalStats.success += stats.success;
      totalStats.skipped += stats.skipped;
      totalStats.errors += stats.errors;
    }

    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully inserted: ${totalStats.success} upgrades`);
    console.log(`⏭️  Skipped (already exist): ${totalStats.skipped} upgrades`);
    console.log(`❌ Errors: ${totalStats.errors} upgrades`);
    console.log(`📁 Total processed: ${totalStats.success + totalStats.skipped + totalStats.errors} upgrades`);

    if (totalStats.errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Check the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAllUpgrades();
}

export { migrateAllUpgrades, migrateTemplateUpgrades };
