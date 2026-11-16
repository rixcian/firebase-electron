import { describe, expect, it, vi } from 'vitest';

vi.mock('./register.js', () => ({
  register: vi.fn(async (project: { projectId: string }) => ({
    keys: { privateKey: 'a', publicKey: 'b', authSecret: 'c' },
    fcm: { token: `token-${project.projectId}` },
    gcm: { androidId: '1', securityToken: '2', token: '3', appId: '4' },
  })),
}));

import { register } from './register.js';
import { registerMany } from './register-many.js';

describe('registerMany', () => {
  it('registers each Firebase project independently', async () => {
    const projects = [
      { appId: 'app-1', apiKey: 'key-1', projectId: 'project-a' },
      { appId: 'app-2', apiKey: 'key-2', projectId: 'project-b' },
    ];

    const results = await registerMany(projects);

    expect(register).toHaveBeenCalledTimes(2);
    expect(results.map((result) => result.fcm.token)).toEqual(['token-project-a', 'token-project-b']);
  });
});
