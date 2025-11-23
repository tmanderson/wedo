/**
 * Service layer tests
 * These tests verify the service interfaces exist and basic logic works
 * Full integration tests require a database connection
 */

import * as registryService from '@/services/registryService';
import * as collaboratorService from '@/services/collaboratorService';
import * as itemService from '@/services/itemService';
import * as inviteService from '@/services/inviteService';
import { parseUrlTitle } from '@/lib/urlParser';

describe('Service Layer', () => {
  describe('registryService', () => {
    it('should export createRegistry function', () => {
      expect(typeof registryService.createRegistry).toBe('function');
    });

    it('should export listRegistriesForUser function', () => {
      expect(typeof registryService.listRegistriesForUser).toBe('function');
    });

    it('should export getRegistryForViewer function', () => {
      expect(typeof registryService.getRegistryForViewer).toBe('function');
    });

    it('should export canUserInvite function', () => {
      expect(typeof registryService.canUserInvite).toBe('function');
    });
  });

  describe('collaboratorService', () => {
    it('should export createCollaborator function', () => {
      expect(typeof collaboratorService.createCollaborator).toBe('function');
    });

    it('should export acceptCollaborator function', () => {
      expect(typeof collaboratorService.acceptCollaborator).toBe('function');
    });

    it('should export removeCollaborator function', () => {
      expect(typeof collaboratorService.removeCollaborator).toBe('function');
    });

    it('should export getCollaborator function', () => {
      expect(typeof collaboratorService.getCollaborator).toBe('function');
    });

    it('should export getCollaboratorByEmail function', () => {
      expect(typeof collaboratorService.getCollaboratorByEmail).toBe('function');
    });
  });

  describe('itemService', () => {
    it('should export createItem function', () => {
      expect(typeof itemService.createItem).toBe('function');
    });

    it('should export updateItem function', () => {
      expect(typeof itemService.updateItem).toBe('function');
    });

    it('should export softDeleteItem function', () => {
      expect(typeof itemService.softDeleteItem).toBe('function');
    });

    it('should export claimItem function', () => {
      expect(typeof itemService.claimItem).toBe('function');
    });

    it('should export releaseItem function', () => {
      expect(typeof itemService.releaseItem).toBe('function');
    });

    it('should export markBought function', () => {
      expect(typeof itemService.markBought).toBe('function');
    });

    it('should export getItem function', () => {
      expect(typeof itemService.getItem).toBe('function');
    });
  });

  describe('inviteService', () => {
    it('should export createInviteTokens function', () => {
      expect(typeof inviteService.createInviteTokens).toBe('function');
    });

    it('should export validateAndConsumeInviteToken function', () => {
      expect(typeof inviteService.validateAndConsumeInviteToken).toBe('function');
    });

    it('should export getInviteTokenInfo function', () => {
      expect(typeof inviteService.getInviteTokenInfo).toBe('function');
    });
  });
});

describe('URL Parser', () => {
  it('should export parseUrlTitle function', () => {
    expect(typeof parseUrlTitle).toBe('function');
  });

  it('should return null for invalid URLs', async () => {
    const result = await parseUrlTitle('not-a-valid-url');
    expect(result).toBeNull();
  });

  it('should return null for non-http protocols', async () => {
    const result = await parseUrlTitle('ftp://example.com');
    expect(result).toBeNull();
  });

  // Note: Real URL parsing tests would require mocking fetch
  // These tests verify the function handles errors gracefully
  it('should handle fetch errors gracefully', async () => {
    // This URL will likely fail to connect, testing error handling
    const result = await parseUrlTitle('http://localhost:99999/nonexistent');
    expect(result).toBeNull();
  });
});
