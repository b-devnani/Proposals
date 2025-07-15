# Proposal Generator

## Overview

This is a full-stack web application for generating home construction proposals and managing upgrades. The system allows users to create proposals by selecting home templates and customizing them with various upgrades. Built with a modern tech stack including React, TypeScript, Express.js, and PostgreSQL with Drizzle ORM.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL
- **Schema**: Centralized schema definitions in `/shared` directory
- **API**: RESTful API endpoints for CRUD operations

### Project Structure
- `/client` - Frontend React application
- `/server` - Backend Express server
- `/shared` - Shared TypeScript types and database schema
- `/migrations` - Database migration files

## Key Components

### Database Schema
Three main entities:
1. **Home Templates**: Base home designs with pricing
2. **Upgrades**: Customization options with categories, locations, and pricing
3. **Proposals**: Customer proposals combining templates and selected upgrades

### Frontend Components
- **Proposal Form**: Main interface for creating proposals
- **Upgrade Table**: Interactive table for selecting home upgrades with grouping by category/location
- **Order Summary**: Real-time calculation and display of pricing
- **Template Selection**: Interface for choosing base home templates

### API Endpoints
- `/api/templates` - CRUD operations for home templates
- `/api/upgrades` - Read operations for available upgrades
- `/api/proposals` - CRUD operations for proposals

## Data Flow

1. **Template Selection**: User selects a base home template
2. **Upgrade Selection**: User browses and selects upgrades organized by category and location
3. **Real-time Calculation**: Order summary updates automatically as upgrades are selected/deselected
4. **Proposal Creation**: Final proposal is created with all selections and pricing

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Drizzle ORM**: Type-safe ORM with schema validation
- **Drizzle Zod**: Runtime validation for database operations

### UI/UX
- **Radix UI**: Unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **TanStack Query**: Server state management

### Development Tools
- **TypeScript**: Type safety across the stack
- **Vite**: Fast development server and build tool
- **ESBuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development
- **Dev Server**: Vite development server with HMR
- **Database**: Neon development database
- **Environment**: Local development with TypeScript compilation

### Production Build
- **Frontend**: Vite builds optimized React bundle to `/dist/public`
- **Backend**: ESBuild bundles Express server to `/dist/index.js`
- **Database**: Production Neon PostgreSQL instance
- **Deployment**: Single deployment with both frontend and backend

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Drizzle migrations stored in `/migrations` directory
- TypeScript path aliases for clean imports

## Changelog
- July 05, 2025. Initial setup
- July 05, 2025. Added lot premium feature with running total calculation
- July 05, 2025. Added base cost tracking and comprehensive margin calculations
- July 05, 2025. Implemented formatted number inputs with comma separators for all dollar amounts
- July 05, 2025. Removed decimal formatting from all currency displays - now shows whole dollars only
- July 05, 2025. Added search and filter functionality for upgrades (search by Choice Title, filter by Category/Location)
- July 05, 2025. Implemented Preview, Export Excel, and Generate PO functionality with comprehensive data export
- July 06, 2025. Enhanced Excel export with comprehensive formatting, professional styling, and complete cell formatting
- July 06, 2025. Standardized all exports (PDF, Preview, Excel) to use identical template format and structure
- July 06, 2025. Fixed Excel formatting issue by replacing XLSX library with ExcelJS for proper styling support
- July 06, 2025. Successfully implemented blue headers, gray labels, currency formatting, and professional Excel styling
- July 11, 2025. Completed comprehensive rename from "Purchase Order Generator" to "Proposal Generator" across entire application including UI text, API endpoints, function names, file exports, and documentation
- July 15, 2025. Implemented sneaky Sales Incentive toggle with subtle "SA" indicator for sales staff discretion
- July 15, 2025. Restructured Order Summary to three-column layout with Base Subtotal, Upgrades Subtotal, and Grand Total
- July 15, 2025. Replaced placeholder data with actual Sorrento selections from Excel file (31,599 upgrade options)
- July 15, 2025. Created dynamic Excel import system for weekly data updates - supports Sorrento, Ravello, and Verona templates
- July 15, 2025. Added Excel validation script and caching system for efficient data loading
- July 15, 2025. Implemented expand all/collapse all functionality with categories expanded by default and collapse only affecting locations
- July 15, 2025. Added custom category sorting order: Structural Options, Flooring, Cabinetry Options, Countertops, Plumbing Trim, Plumbing Options, HVAC Options, Electrical, Light Fixtures, Smart Home, Fireplace, Millwork, Interior Trim, Appliances, Paint, Roofing, Mirrors/Medicine Cabinets & Accessories
- July 15, 2025. Added custom location sorting order: 01 - Elevations, 02 - Backyard, Main Living Area, Family Room, Kitchen, Owner's Bath, Bath 2, Owner's Suite, Bedroom 2, Dining Room, Bedroom 3, Laundry Room, Mudroom, Foyer, Whole House, Unassigned, Garage, Basement
- July 15, 2025. Added password protection to website access - requires password "7879" to enter application, with localStorage persistence for user session
- July 15, 2025. Added password protection to "Show Builder Cost & Margin" toggle - now off by default and requires password "8582" to enable cost view
- July 15, 2025. Fixed Excel export functionality that was broken by hierarchical upgrade structure changes - resolved duplicate declarations and updated data processing for three-level hierarchy
- July 15, 2025. Removed ALL merged cells from Excel export per user request - replaced with proper column width adjustments for clean formatting without cell merging
- July 15, 2025. Updated Excel export formatting with consistent right alignment for customer information, pricing breakdown, and signatures sections, plus matching cell colors across columns A and B
- July 15, 2025. Enhanced Excel export with location sub-groups displayed as separate rows (instead of in brackets) and fixed inconsistent cell colors across columns A and B for all header rows
- July 15, 2025. Fixed Excel export signature text alignment to left-aligned and ensured complete color consistency across all header rows in both columns A and B
- July 15, 2025. Updated Excel export to use SUM formulas instead of hardcoded values for Base Subtotal, Upgrades Subtotal, and Grand Total calculations
- July 15, 2025. Added standardized print settings to Excel export: narrow margins, custom scaling (1 page wide x 2 pages tall), horizontal centering, and optimized column A width for better scaling
- July 15, 2025. Removed Preview button from interface for cleaner UX
- July 15, 2025. Updated Generate Proposal button to create PDF version of Excel export instead of database storage - now generates professional PDF with same structure and formatting as Excel export

## User Preferences

Preferred communication style: Simple, everyday language.