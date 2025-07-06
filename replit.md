# Purchase Order Management System

## Overview

This is a full-stack web application for managing home purchase orders and upgrades. The system allows users to create purchase orders by selecting home templates and customizing them with various upgrades. Built with a modern tech stack including React, TypeScript, Express.js, and PostgreSQL with Drizzle ORM.

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
3. **Purchase Orders**: Customer orders combining templates and selected upgrades

### Frontend Components
- **Purchase Order Form**: Main interface for creating orders
- **Upgrade Table**: Interactive table for selecting home upgrades with grouping by category/location
- **Order Summary**: Real-time calculation and display of pricing
- **Template Selection**: Interface for choosing base home templates

### API Endpoints
- `/api/templates` - CRUD operations for home templates
- `/api/upgrades` - Read operations for available upgrades
- `/api/purchase-orders` - CRUD operations for purchase orders

## Data Flow

1. **Template Selection**: User selects a base home template
2. **Upgrade Selection**: User browses and selects upgrades organized by category and location
3. **Real-time Calculation**: Order summary updates automatically as upgrades are selected/deselected
4. **Order Creation**: Final purchase order is created with all selections and pricing

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

## User Preferences

Preferred communication style: Simple, everyday language.