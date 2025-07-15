#!/usr/bin/env node

/**
 * Excel Data Update Script
 * 
 * This script helps update the Excel data files for home templates.
 * Usage: node scripts/update-excel-data.js
 */

import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '..', 'attached_assets');
const EXPECTED_COLUMNS = [
  'Parent Selection',
  'Choice Title', 
  'Category',
  'Location',
  'Builder Cost',
  'Client Price',
  'Margin'
];

function validateExcelFile(filePath) {
  console.log(`\n📊 Validating: ${path.basename(filePath)}`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length === 0) {
      console.log('❌ File is empty');
      return false;
    }
    
    const headers = data[0];
    console.log('📋 Headers found:', headers);
    
    // Check for required columns
    const missingColumns = EXPECTED_COLUMNS.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      console.log('❌ Missing required columns:', missingColumns);
      return false;
    }
    
    // Check data rows
    const dataRows = data.slice(1);
    console.log(`✅ Found ${dataRows.length} upgrade rows`);
    
    // Sample a few rows to check data format
    if (dataRows.length > 0) {
      const sampleRow = dataRows[0];
      console.log('📋 Sample row:', sampleRow);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Error reading file:', error.message);
    return false;
  }
}

function scanForExcelFiles() {
  console.log('🔍 Scanning for Excel files...');
  
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log('❌ Assets directory not found');
    return;
  }
  
  const files = fs.readdirSync(ASSETS_DIR);
  const excelFiles = files.filter(file => file.endsWith('.xlsx'));
  
  console.log(`📁 Found ${excelFiles.length} Excel files:`);
  excelFiles.forEach(file => console.log(`  - ${file}`));
  
  return excelFiles;
}

function main() {
  console.log('🏠 Home Template Excel Data Updater');
  console.log('=====================================');
  
  const excelFiles = scanForExcelFiles();
  
  if (!excelFiles || excelFiles.length === 0) {
    console.log('❌ No Excel files found in attached_assets directory');
    return;
  }
  
  console.log('\n🔍 Validating Excel files...');
  
  excelFiles.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const isValid = validateExcelFile(filePath);
    
    if (isValid) {
      console.log(`✅ ${file} is valid and ready to use`);
    } else {
      console.log(`❌ ${file} needs to be fixed`);
    }
  });
  
  console.log('\n📝 To add a new template:');
  console.log('1. Place Excel file in attached_assets directory');
  console.log('2. Update server/excel-import.ts fileMap with the new template name');
  console.log('3. Restart the application');
  
  console.log('\n🔄 To update existing data:');
  console.log('1. Replace the Excel file in attached_assets directory');
  console.log('2. Restart the application (data is cached per session)');
}

main();