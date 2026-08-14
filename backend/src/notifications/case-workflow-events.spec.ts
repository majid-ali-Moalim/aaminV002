import {
  buildCaseNotificationContent,
  resolveCaseEventRecipientUserIds,
  statusToCaseWorkflowEvent,
} from './case-workflow-events';

describe('case-workflow-events', () => {
  const ctx = {
    caseId: 'case-1',
    trackingCode: 'CASE-2026-0019',
    priority: 'CRITICAL' as const,
    stationId: 'station-1',
    regionId: 'region-1',
    driverUserId: 'driver-user',
    nurseUserId: 'nurse-user',
    dispatcherUserId: 'dispatcher-user',
  };

  const admins = ['admin-1'];
  const stationDispatchers = ['dispatcher-station'];

  it('maps DISPATCHED to CASE_STARTED', () => {
    expect(statusToCaseWorkflowEvent('DISPATCHED')).toBe('CASE_STARTED');
  });

  it('maps COMPLETED to CASE_COMPLETED', () => {
    expect(statusToCaseWorkflowEvent('COMPLETED')).toBe('CASE_COMPLETED');
  });

  it('new emergency notifies dispatcher and admin only', () => {
    const ids = resolveCaseEventRecipientUserIds('NEW_EMERGENCY_REQUEST', ctx, admins, stationDispatchers);
    expect(ids).toContain('admin-1');
    expect(ids).toContain('dispatcher-user');
    expect(ids).not.toContain('driver-user');
    expect(ids).not.toContain('nurse-user');
  });

  it('crew assigned notifies assigned crew, dispatcher, and admin', () => {
    const ids = resolveCaseEventRecipientUserIds('CREW_ASSIGNED', ctx, admins, stationDispatchers);
    expect(ids).toEqual(
      expect.arrayContaining(['driver-user', 'nurse-user', 'dispatcher-user', 'admin-1']),
    );
  });

  it('case started excludes driver', () => {
    const ids = resolveCaseEventRecipientUserIds('CASE_STARTED', ctx, admins, stationDispatchers);
    expect(ids).toContain('nurse-user');
    expect(ids).not.toContain('driver-user');
  });

  it('patient loaded notifies driver not nurse', () => {
    const ids = resolveCaseEventRecipientUserIds('PATIENT_LOADED', ctx, admins, stationDispatchers);
    expect(ids).toContain('driver-user');
    expect(ids).not.toContain('nurse-user');
  });

  it('handover completed notifies driver not nurse', () => {
    const ids = resolveCaseEventRecipientUserIds('HANDOVER_COMPLETED', ctx, admins, stationDispatchers);
    expect(ids).toContain('driver-user');
    expect(ids).not.toContain('nurse-user');
  });

  it('case completed notifies full assigned team', () => {
    const ids = resolveCaseEventRecipientUserIds('CASE_COMPLETED', ctx, admins, stationDispatchers);
    expect(ids).toEqual(
      expect.arrayContaining(['driver-user', 'nurse-user', 'dispatcher-user', 'admin-1']),
    );
  });

  it('builds minimal desktop-friendly content', () => {
    const content = buildCaseNotificationContent('NEW_EMERGENCY_REQUEST', 'CASE-2026-0019', 'CRITICAL');
    expect(content.desktopBody).toContain('CASE-2026-0019');
    expect(content.message).not.toMatch(/chest pain/i);
  });
});
