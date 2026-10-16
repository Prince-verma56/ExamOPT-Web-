import { UserService } from '@/modules/users/service';
import { buildAIContext, AIContext } from './index';

export async function createAuthenticatedAIContext(
  channel: 'text' | 'voice' | 'agent',
  overrides?: Partial<AIContext>
): Promise<AIContext> {
  const user = await UserService.getCurrentUser();
  
  if (!user) {
    return buildAIContext({
      channel,
      role: 'guest',
      permissions: [],
      ...overrides,
    });
  }

  // Assuming user model has a role.
  // Real implementation might fetch specific RBAC permissions
  return buildAIContext({
    channel,
    userId: user.id,
    role: user.role,
    permissions: user.role === 'admin' ? ['admin', 'user'] : ['user'],
    ...overrides,
  });
}
