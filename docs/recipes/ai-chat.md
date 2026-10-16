# AI Chat Recipe

To implement AI chat inside a module, you can leverage the `AIContextBuilder` and the built-in Vercel AI SDK route.

## Setup

1. **Frontend Component**
Use the `useChat` hook from `ai/react`:
```tsx
'use client';
import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/ai/chat',
    body: { conversationId: 'optional-persistent-id' }
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

2. **Backend Route Handler** (`app/api/ai/chat/route.ts`)
```typescript
import { streamText } from 'ai';
import { AIContextBuilder } from '@/ai/context/builder';
import { getAIProvider } from '@/ai/core/factory';

export async function POST(req: Request) {
  const { messages, conversationId } = await req.json();
  
  const aiContext = await AIContextBuilder.build({ 
    channel: 'text', 
    conversationId,
    includeHistory: true 
  });
  
  const provider = getAIProvider(aiContext);

  const result = await streamText({
    model: provider.chat('gpt-4o-mini'),
    messages,
    // Provide MCP tools securely
    // tools: await mcpAdapter.getMCPTools(aiContext)
  });

  return result.toDataStreamResponse();
}
```
