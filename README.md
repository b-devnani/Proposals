# Purchase Order Management System

A comprehensive purchase order generator for home construction projects with advanced Excel export capabilities.

## Features

- **Home Templates**: Three customizable home designs (Ravello, Sorrento, Verona)
- **Dynamic Upgrades**: Hierarchical upgrade system with categories and locations
- **Real-time Calculations**: Live pricing updates with base price, lot premium, and upgrade totals
- **Professional Excel Export**: Exact template formatting with merged cells, colors, and formulas
- **PDF Generation**: Complete purchase order documents with signatures
- **Search & Filter**: Find upgrades by title, category, or location

## Quick Start

### Prerequisites
- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### Installation

1. **Download/clone the project**
   ```bash
   git clone <your-repo-url>
   cd purchase-order-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**

   **For Windows users:**
   ```cmd
   set NODE_ENV=development && npx tsx server/index.ts
   ```

   **For Mac/Linux users:**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Go to `http://localhost:5000`
   - The purchase order system will load

## Windows Troubleshooting

If you get the error `'NODE_ENV' is not recognized`, try these solutions:

### Option 1: Use the Windows Command
```cmd
set NODE_ENV=development && npx tsx server/index.ts
```

### Option 2: Use PowerShell
```powershell
$env:NODE_ENV="development"; npx tsx server/index.ts
```

### Option 3: Install cross-env (if you can edit package.json)
```bash
npm install --save-dev cross-env
```
Then change the script to: `"dev": "cross-env NODE_ENV=development tsx server/index.ts"`

## Usage

1. **Select a Home Template** - Choose from Ravello, Sorrento, or Verona
2. **Fill in Details** - Enter buyer information, lot details, and pricing
3. **Choose Upgrades** - Browse by category and location, select desired options
4. **Review Summary** - Check totals and calculations in real-time
5. **Export** - Generate Excel files or PDFs with professional formatting

## Excel Export Features

- **Exact Template Matching**: Cell-by-cell formatting following provided templates
- **Professional Styling**: Blue headers, gray labels, alternating row colors
- **Merged Cells**: Proper header formatting and company branding
- **Currency Formatting**: Whole dollar amounts with proper comma separation
- **Formula Preservation**: Working Excel formulas for calculations
- **Summary Section**: Automatic totals with base price, upgrades, and grand total
- **Signature Areas**: Professional signature blocks for buyer and company

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **UI**: Tailwind CSS + shadcn/ui components
- **Data**: In-memory storage (resets on restart)
- **Export**: ExcelJS for Excel files, jsPDF for PDFs

## Development

- **Hot Reload**: Changes automatically update in browser
- **TypeScript**: Full type safety across frontend and backend
- **Modern Tools**: ESBuild for fast compilation

## Production Build

```bash
npm run build
npm start
```

## Support

If you encounter issues:
1. Make sure Node.js version 18+ is installed
2. Try deleting `node_modules` and running `npm install` again
3. Check that no other applications are using port 5000
4. For Windows users, use the specific commands provided above

---

Built with modern web technologies for professional home construction purchase order management.