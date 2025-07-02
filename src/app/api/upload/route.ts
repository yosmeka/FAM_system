// import { Response } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { withRole } from '@/middleware/rbac';

const allowedMimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/gif',
  'text/plain',
];

// Helper function to ensure upload directory exists
async function ensureUploadDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
}

// POST /api/upload - Upload a file
export const POST = withRole(['ADMIN', 'MANAGER', 'USER'], async function POST(
  req: Request
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the request is multipart/form-data
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return Response.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const assetId = formData.get('assetId') as string;
    const documentType = formData.get('documentType') as string;

    if (!file || !assetId || !documentType) {
      return Response.json(
        { error: 'Missing required fields: file, assetId, documentType' },
        { status: 400 }
      );
    }

    // Validate file
    if (file.size === 0) {
      return Response.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Limit file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return Response.json(
        { error: 'File size exceeds the limit (10MB)' },
        { status: 400 }
      );
    }

    // ✅ MIME type check here
    if (!allowedMimeTypes.includes(file.type)) {
      return Response.json(
        { error: 'Unsupported file type. Only PDF, images, and text files are allowed.' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', assetId);
    await ensureUploadDir(uploadDir);

    // Generate a unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const fileName = `${timestamp}-${originalName}`;
    const filePath = join(uploadDir, fileName);

    // Convert file to buffer and save it
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Generate URL for the file
    const fileUrl = `/uploads/${assetId}/${fileName}`;

    return Response.json({
      url: fileUrl,
      fileName: originalName,
      fileSize: file.size,
      filePath: filePath,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return Response.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
});
