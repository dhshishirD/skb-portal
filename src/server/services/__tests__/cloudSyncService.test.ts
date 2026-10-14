import { describe, it, expect, beforeEach } from 'vitest';
import { CloudSyncService, CloudDocumentRecord, CloudBeneficiaryRecord } from '../cloudSyncService';

describe('Phase 1: CloudSyncService Database Wiring & Fallback', () => {
  beforeEach(() => {
    // Clear mock localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('should return an empty list or cached list when querying project documents offline', async () => {
    const docs = await CloudSyncService.getProjectDocuments('NON-EXISTENT-PROJECT');
    expect(Array.isArray(docs)).toBe(true);
  });

  it('should save and retrieve a document record accurately', async () => {
    const mockDoc: CloudDocumentRecord = {
      id: `doc-${Date.now()}`,
      projectId: 'BD-SKB-2026-COW-20',
      name: 'Form-7 Bovine Livestock Handover Audit.pdf',
      category: 'MANDATORY_PRIMARY',
      fileSize: '2.4 MB',
      status: 'Submitted',
      uploadedBy: 'Mizbah Uddin (Program Officer)',
      uploadedAt: '2026-10-14',
    };

    const saved = await CloudSyncService.saveProjectDocument(mockDoc);
    expect(saved).toBe(true);

    const docs = await CloudSyncService.getProjectDocuments('BD-SKB-2026-COW-20');
    expect(docs.length).toBeGreaterThanOrEqual(1);
    const found = docs.find(d => d.id === mockDoc.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Form-7 Bovine Livestock Handover Audit.pdf');
  });

  it('should register and retrieve verified beneficiaries with cloud metadata', async () => {
    const mockBen: Omit<CloudBeneficiaryRecord, 'id' | 'registeredAt'> = {
      projectId: 'BD-SKB-2026-COW-20',
      fullName: 'Rashida Begum',
      nationalId: '1990192837465',
      phone: '+880 1812-345678',
      sex: 'female',
      birthYear: 1990,
      vulnerability: 'Widow household, female-headed',
      locationName: "Cox's Bazar, Ukhia",
    };

    const created = await CloudSyncService.addBeneficiary(mockBen);
    expect(created.id).toBeDefined();
    expect(created.fullName).toBe('Rashida Begum');

    const list = await CloudSyncService.getBeneficiaries('BD-SKB-2026-COW-20');
    expect(list.length).toBeGreaterThanOrEqual(1);
    const found = list.find(b => b.nationalId === '1990192837465');
    expect(found).toBeDefined();
  });
});

describe('Phase 3: Realtime Subscriptions & Broadcast Delivery', () => {
  it('should initialize and cleanly unsubscribe from realtime documents channel', () => {
    let receivedEvent: any = null;
    const sub = CloudSyncService.subscribeToDocuments((event) => {
      receivedEvent = event;
    });

    expect(sub).toBeDefined();
    expect(typeof sub.unsubscribe).toBe('function');
    expect(() => sub.unsubscribe()).not.toThrow();
  });

  it('should initialize and cleanly unsubscribe from realtime projects channel', () => {
    const sub = CloudSyncService.subscribeToProjects((_event) => {});
    expect(sub).toBeDefined();
    expect(typeof sub.unsubscribe).toBe('function');
    expect(() => sub.unsubscribe()).not.toThrow();
  });

  it('should broadcast live events safely without crashing in test runner', () => {
    expect(() => {
      CloudSyncService.broadcastLiveEvent('document-uploaded', {
        projectId: 'BD-SKB-2026-COW-20',
        name: 'Form-7 Bovine Livestock Handover Audit.pdf',
        officer: 'Md. Abu Huraira',
      });
    }).not.toThrow();
  });
});
