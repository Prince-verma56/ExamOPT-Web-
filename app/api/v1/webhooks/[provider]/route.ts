import { NextResponse } from 'next/server';
import { webhookService } from '@/server/integrations/webhooks';

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  const provider = resolvedParams.provider;
  
  try {
    const rawBody = await req.text();
    await webhookService.processIncoming(provider, req, rawBody);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(`[Webhook Error - ${provider}]:`, error);
    // Standardized webhook failure response (most providers ignore body, but rely on status code)
    return new NextResponse((error as Error).message || 'Webhook processing failed', { status: 400 });
  }
}
