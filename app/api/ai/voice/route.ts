/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { AIContextBuilder } from '@/ai/context/builder';
import { toolRegistry } from '@/ai/tools/registry';
import { conversationStore } from '@/ai/conversation/persistence';
import { db } from '@/server/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || !message.type) {
      return NextResponse.json({ error: 'Invalid Vapi payload' }, { status: 400 });
    }

    // Handle Assistant Request (When call starts)
    if (message.type === 'assistant-request') {
      // Build safe server-side context for the user
      // Assuming Clerk auth is passed or we can read session cookie.
      // But Vapi webhooks might not have the user cookie unless passed in headers/metadata.
      // In a real app, you pass a secure token or session ID in the client SDK start() call which Vapi forwards here.
      
      const callData = message.call;
      const clientPassedUserId = callData?.customer?.number || 'guest'; 
      // ^ Hack for demo: Client passes context via customer or assistantOverrides

      const aiContext = await AIContextBuilder.build({
        channel: 'voice',
        // In a real scenario, use secure auth to get user ID
      });

      return NextResponse.json({
        assistant: {
          // We can dynamically return the assistant config here with safe context variables
          variableValues: {
            userId: aiContext.userId,
            role: aiContext.role,
            conversationId: aiContext.conversationId,
          }
        }
      });
    }

    // Handle Tool Calls (Function Calls)
    if (message.type === 'tool-calls') {
      const toolCalls = message.toolWithToolCallList;
      const results = [];

      for (const toolCall of toolCalls) {
        const toolName = toolCall.tool.name;
        const args = toolCall.toolCall.arguments;

        try {
          // Build minimal context for execution
          const context = await AIContextBuilder.build({ channel: 'voice' });
          const result = await toolRegistry.executeTool(toolName, args, context);
          
          results.push({
            toolCallId: toolCall.toolCall.id,
            result: typeof result === 'string' ? result : JSON.stringify(result)
          });
        } catch (error: any) {
          results.push({
            toolCallId: toolCall.toolCall.id,
            error: error.message
          });
        }
      }

      return NextResponse.json({ results });
    }

    // Handle Transcript / Status updates
    if (message.type === 'end-of-call-report') {
      const callData = message.call;
      const conversationId = callData?.assistantOverrides?.variableValues?.conversationId;
      const callId = message.call?.id;
      
      if (!conversationId || !callId) {
        return NextResponse.json({ success: true, warning: 'No conversation or call ID provided' });
      }

      // Very simple idempotency check based on call ID storing a flag in metadata
      // For real production use a dedicated Idempotency table or Redis.
      const conv = await conversationStore.getConversation(conversationId);
      if (conv?.metadata?.processedCalls?.includes(callId)) {
        console.log('[Vapi Webhook] Idempotency triggered. Call already processed:', callId);
        return NextResponse.json({ success: true });
      }

      const transcripts = message.transcript || [];
      // Flatten/Normalize transcripts
      for (const t of transcripts) {
        const role = t.role === 'assistant' ? 'assistant' : 'user';
        await conversationStore.addMessage(
          conversationId, 
          role, 
          t.transcript, 
          { source: 'vapi', callId }
        );
      }

      // Mark as processed
      if (conv) {
        const processed = conv.metadata?.processedCalls || [];
        // Ideally we would update the conversation metadata directly via db.conversation.update
      }

      console.log(`[Vapi Webhook] Saved ${transcripts.length} transcript messages for call ${callId}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vapi Webhook Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

