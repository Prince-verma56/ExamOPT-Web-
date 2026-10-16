import { createApiRoute } from '@/server/api';
import { filePipeline } from '@/server/files/pipeline';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Use generic Next.js FormData parsing as it handles multipart/form-data natively
  const formData = await req.formData().catch(() => null);
  
  if (!formData) {
    return NextResponse.json({ success: false, error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const initialMetadata = {
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    url: `/uploads/${uuidv4()}-${file.name}`, // In real app, upload to S3/Cloud storage
  };

  try {
    const finalMetadata = await filePipeline.run(buffer, initialMetadata);

    return NextResponse.json({
      success: true,
      data: finalMetadata,
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
