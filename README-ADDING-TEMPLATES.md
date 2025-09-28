# Adding New Home Templates with Images

This guide shows you the **best and easiest ways** to add new home template entries with images to the database.

## 🚀 Quick Start (Recommended)

### Method 1: Interactive Script (Easiest)

```bash
npx tsx scripts/quick-add-template.ts
```

This will prompt you for all template details and handle the image conversion automatically.

### Method 2: Direct Database Script

```bash
npx tsx scripts/add-template-with-image.ts
```

Then modify the script to include your template data.

## 📋 Available Methods

### 1. **Interactive Script** (Recommended for beginners)

- **File**: `scripts/quick-add-template.ts`
- **Usage**: `npx tsx scripts/quick-add-template.ts`
- **Best for**: One-off additions, testing
- **Features**:
  - Interactive prompts for all fields
  - Multiple image input options
  - Error handling and validation

### 2. **Direct Database Script** (Most flexible)

- **File**: `scripts/add-template-with-image.ts`
- **Usage**: Import and call `addTemplateWithImage()`
- **Best for**: Bulk operations, automation
- **Features**:
  - Support for multiple image input methods
  - Programmatic control
  - Reusable function

### 3. **API Endpoint** (For web applications)

- **Endpoint**: `POST /api/templates`
- **Usage**: HTTP request with JSON payload
- **Best for**: Web forms, external integrations
- **Features**:
  - RESTful API
  - JSON validation
  - HTTP status codes

## 🖼️ Image Input Options

### Option A: From `attached_assets/` folder (Recommended)

```typescript
await addTemplateWithImage({
  name: "New Template",
  basePrice: "650000",
  baseCost: "520000",
  beds: "3 Beds",
  baths: "2.5 Baths",
  garage: "2 Car Garage",
  sqft: 2100,
  imageFile: "NewTemplate.webp" // Put file in attached_assets/ folder
});
```

### Option B: From system file path

```typescript
await addTemplateWithImage({
  name: "New Template",
  basePrice: "650000",
  baseCost: "520000",
  beds: "3 Beds",
  baths: "2.5 Baths",
  garage: "2 Car Garage",
  sqft: 2100,
  imagePath: "/path/to/your/image.webp" // Full system path
});
```

### Option C: From base64 string

```typescript
await addTemplateWithImage({
  name: "New Template",
  basePrice: "650000",
  baseCost: "520000",
  beds: "3 Beds",
  baths: "2.5 Baths",
  garage: "2 Car Garage",
  sqft: 2100,
  imageBase64: "data:image/webp;base64,/9j/4AAQSkZJRgABAQAAAQ...", // Full data URL
  mimeType: "image/webp"
});
```

### Option D: No image (add later)

```typescript
await addTemplateWithImage({
  name: "New Template",
  basePrice: "650000",
  baseCost: "520000",
  beds: "3 Beds",
  baths: "2.5 Baths",
  garage: "2 Car Garage",
  sqft: 2100
  // No image fields - can be added later via PATCH
});
```

## 🔧 API Usage Examples

### Create Template via API

```bash
curl -X POST http://localhost:8084/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Template",
    "basePrice": "650000",
    "baseCost": "520000",
    "beds": "3 Beds",
    "baths": "2.5 Baths",
    "garage": "2 Car Garage",
    "sqft": 2100,
    "imageData": "base64-encoded-image-data",
    "imageMimeType": "image/webp"
  }'
```

### Update Template Image Later

```bash
curl -X PATCH http://localhost:8084/api/templates/4 \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "new-base64-encoded-image-data",
    "imageMimeType": "image/png"
  }'
```

## 📁 File Structure

```
Proposals/
├── attached_assets/          # Put new images here
│   ├── NewTemplate.webp
│   ├── AnotherTemplate.png
│   └── ...
├── scripts/
│   ├── quick-add-template.ts      # Interactive script
│   ├── add-template-with-image.ts # Direct database script
│   └── add-template-via-api.ts    # API-based script
└── server/
    ├── routes.ts                  # API endpoints
    └── storage.ts                 # Database operations
```

## 🎯 Best Practices

### 1. **Image Preparation**

- **Format**: Use WebP for best compression (recommended)
- **Size**: Keep images under 2MB for performance
- **Dimensions**: Use consistent aspect ratios (4:3 works well)
- **Quality**: Balance file size vs. image quality

### 2. **Naming Convention**

- **Files**: `TemplateName_YYYYMMDD.webp` (e.g., `Ravello_20241201.webp`)
- **Templates**: Use consistent naming (e.g., "Ravello", "Sorrento")

### 3. **Database Fields**

- **Required**: `name`, `basePrice`, `beds`, `baths`, `garage`, `sqft`
- **Optional**: `baseCost`, `imageData`, `imageMimeType`
- **Auto-generated**: `id`, `imageUrl` (kept empty for database storage)

### 4. **Error Handling**

- Always check if image files exist before processing
- Validate image formats and sizes
- Handle database connection errors gracefully

## 🚨 Troubleshooting

### Common Issues

1. **"Image file not found"**

   - Check file path is correct
   - Ensure file exists in `attached_assets/` folder
   - Verify file permissions
2. **"Invalid template data"**

   - Check all required fields are provided
   - Ensure numeric fields are valid numbers
   - Verify string fields are not empty
3. **"Database connection failed"**

   - Check `DATABASE_URL` environment variable
   - Ensure database is running and accessible
   - Verify network connectivity
4. **"Image too large"**

   - Compress image before adding
   - Consider using WebP format
   - Reduce image dimensions if needed

### Getting Help

- Check the console output for detailed error messages
- Verify your database connection with `npm run db:push`
- Test with a small image first to isolate issues

## 🎉 Success!

Once added, your new template will:

- Appear in the home selector page
- Be available for creating proposals
- Serve images from `/api/templates/{id}/image`
- Be fully integrated with the existing system

The image will be stored as base64 in the database and served efficiently through the API endpoint with proper caching headers.
