import { z } from 'zod';

export const AIAnalysisSchema = z.object({
  problemSummary: z.string(),
  primaryUsers: z.array(z.string()),
  secondaryUsers: z.array(z.string()),
  corePainPoint: z.string(),
  proposedSolution: z.string(),
  mustHaveFeatures: z.array(z.string()),
  niceToHaveFeatures: z.array(z.string()),
  
  // Specific capability lists mapped by ID
  recommendedCapabilities: z.array(z.string()),
  optionalCapabilities: z.array(z.string()),
  unnecessaryCapabilities: z.array(z.string()),
  
  // High-level explanations for AI/Voice/Realtime/Storage/Payments/Location
  aiUseCases: z.array(z.string()),
  voiceUseCase: z.string().nullable(),
  realtimeUseCase: z.string().nullable(),
  storageUseCase: z.string().nullable(),
  paymentUseCase: z.string().nullable(),
  locationUseCase: z.string().nullable(),
  
  mobileRequirement: z.enum(['REQUIRED', 'OPTIONAL', 'NOT_NEEDED']),
  
  // Planning
  dataEntities: z.array(z.object({
    name: z.string(),
    description: z.string()
  })),
  apiRequirements: z.array(z.string()),
  integrationRequirements: z.array(z.string()),
  
  // Risk & MVP
  riskAreas: z.array(z.string()),
  technicalRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  timeCriticalFeatures: z.array(z.string()),
  mvpScope: z.array(z.string()),
  stretchScope: z.array(z.string()),
  reasoning: z.string()
});

export type AIAnalysisResult = z.infer<typeof AIAnalysisSchema>;
