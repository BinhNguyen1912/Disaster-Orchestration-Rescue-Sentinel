# Feature: Cloudflare R2 Media Upload Flow

## Business Description
This module provides a unified interface for uploading media assets (SOS photos, damage report attachments, user avatars, donation receipts) to Cloudflare R2 storage in memory. The files are not saved locally but directly streamed to R2, returning public access URLs.

References:
- `be/docs/PROJECT_RULES.md` (Section 6.1, 6.2 Tech Stack - Cloudflare R2)

## API Contract

### 1. Upload Single File (Public)
- **Method:** `POST`
- **Path:** `/api/v1/upload/single`
- **Auth:** Public (accessible by guests for SOS submissions)
- **Query Params:**
  - `folder` (string, optional, default: `general` - e.g. `sos`, `avatar`, `casualty`, `donation`)
- **Request Body (multipart/form-data):**
  - `file`: binary file data
- **Response (201 Created):**
  ```json
  {
    "url": "https://pub-c5cf1ffafa06aab858588e61508247f7.r2.dev/sos/1718234567-987654321.jpg"
  }
  ```

### 2. Upload Multiple Files (Public)
- **Method:** `POST`
- **Path:** `/api/v1/upload/multiple`
- **Auth:** Public
- **Query Params:**
  - `folder` (string, optional, default: `general`)
- **Request Body (multipart/form-data):**
  - `files`: array of binary file data
- **Response (201 Created):**
  ```json
  {
    "urls": [
      "https://pub-c5cf1ffafa06aab858588e61508247f7.r2.dev/sos/1718234567-987654321.jpg",
      "https://pub-c5cf1ffafa06aab858588e61508247f7.r2.dev/sos/1718234567-987654322.jpg"
    ]
  }
  ```

## Business Rules Applied
- `BR-UPLOAD-01`: Supported file types: Images (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) and Documents (`application/pdf`).
- `BR-UPLOAD-02`: Maximum single file size: 10MB.
- `BR-UPLOAD-03`: Files are processed entirely in-memory using Multer's `memoryStorage` to avoid disk dependency.
- `BR-UPLOAD-04`: Filenames are randomized with a timestamp suffix to prevent collision: `${folder}/${Date.now()}-${randomPart}${ext}`.

## Entities Affected
- None (Storage only, no database storage for raw files; URLs are saved inside SOS / User profile entities upon creation).

## Permissions Required
- None (Public endpoints).

## Implementation Order
1. Install npm packages: `@aws-sdk/client-s3`, `multer`, and `@types/multer` (dev).
2. Add `StorageService` in `src/infrastructure/storage/storage.service.ts` using `S3Client` and `@nestjs/config`.
3. Export it in `StorageModule` (`src/infrastructure/storage/storage.module.ts`).
4. Add `UploadController` with route handlers using Multer `FileInterceptor` and `FilesInterceptor`.
5. Create `UploadModule` and register it in `AppModule`.
6. Verify locally.
