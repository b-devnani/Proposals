import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { Upgrade } from '../shared/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ExcelUpgradeRow {
  'Parent Selection': string;
  'Choice Title': string;
  'Category': string;
  'Location': string;
  ' Builder Cost ': number;
  ' Client Price ': number;
  'Margin': number | string;
}

export function readExcelUpgrades(fileName: string): Upgrade[] {
  const excelPath = path.join(__dirname, '..', 'attached_assets', fileName);
  
  try {
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: ExcelUpgradeRow[] = XLSX.utils.sheet_to_json(worksheet);
    
    return data.map((row, index) => ({
      id: index + 1,
      selectionId: `excel-${index + 1}`,
      choiceId: `choice-${index + 1}`,
      parentSelection: row['Parent Selection'],
      choiceTitle: row['Choice Title'],
      category: row['Category'],
      location: row['Location'],
      builderCost: String(row[' Builder Cost '] || 0),
      clientPrice: String(row[' Client Price '] || 0),
      margin: typeof row['Margin'] === 'number' ? String(row['Margin']) : '0'
    }));
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return [];
  }
}

export function getHomeTemplateUpgrades(templateName: string): Upgrade[] {
  const fileMap: { [key: string]: string } = {
    'Sorrento': 'Sorrento Selections_1752602550627.xlsx',
    'Ravello': 'Ravello Selections.xlsx', // Will be added when provided
    'Verona': 'Verona Selections.xlsx'    // Will be added when provided
  };
  
  const fileName = fileMap[templateName];
  if (!fileName) {
    console.warn(`No Excel file found for template: ${templateName}`);
    return [];
  }
  
  return readExcelUpgrades(fileName);
}