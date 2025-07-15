import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Sorrento Selections Excel file
const excelPath = path.join(__dirname, '..', 'attached_assets', 'Sorrento Selections_1752601734130.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetNames = workbook.SheetNames;
  console.log('Sheet Names:', sheetNames);
  
  // Read the first sheet
  const worksheet = workbook.Sheets[sheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('\nFirst 10 rows of data:');
  data.slice(0, 10).forEach((row, index) => {
    console.log(`Row ${index + 1}:`, row);
  });
  
  // Try to convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  console.log('\nFirst 5 items as JSON:');
  console.log(JSON.stringify(jsonData.slice(0, 5), null, 2));
  
} catch (error) {
  console.error('Error reading Excel file:', error);
}