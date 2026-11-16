import { describe, expect, it, vi } from 'vitest';

vi.mock('./listen.js', () => ({
  listen: vi.fn(async (credentials: { gcm: { androidId: string } }) => ({
    id: credentials.gcm.androidId,
    destroy: vi.fn(),
  })),
}));

import { listen } from './listen.js';
import { listenMany } from './listen-many.js';

describe('listenMany', () => {
  it('starts a listener for each credentials set', async () => {
    const callback = vi.fn();
    const credentialsList = [
      {
        gcm: { androidId: '1', securityToken: 'a' },
        keys: { privateKey: 'p', authSecret: 's' },
        persistentIds: [],
      },
      {
        gcm: { androidId: '2', securityToken: 'b' },
        keys: { privateKey: 'p', authSecret: 's' },
        persistentIds: [],
      },
    ];

    const clients = await listenMany(credentialsList, callback);

    expect(listen).toHaveBeenCalledTimes(2);
    expect(clients).toHaveLength(2);
  });
});
