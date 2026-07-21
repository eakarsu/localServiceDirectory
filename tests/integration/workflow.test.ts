import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNoOverbooking, DomainError } from '../../src/lib/field-service/policy';
import {
  applyOfflineWorkflowCommand,
  applyWorkflowCommand,
  createWorkflowState,
  WorkflowState,
} from '../../src/lib/field-service/workflow';

function quotedAndConfirmed(): WorkflowState {
  let state = createWorkflowState(
    '2026-08-01T09:00:00.000Z',
    '2026-08-01T10:00:00.000Z',
  );
  state = applyWorkflowCommand(state, { type: 'SEND_QUOTE' });
  state = applyWorkflowCommand(state, { type: 'ACCEPT_QUOTE' });
  return applyWorkflowCommand(state, { type: 'CONFIRM_BOOKING' });
}

test('quote through partial work, change order, invoice, payment, and refunds', () => {
  let state = quotedAndConfirmed();
  state = applyWorkflowCommand(state, { type: 'ASSIGN', technicianId: 'tech-1' });
  state = applyWorkflowCommand(state, { type: 'DISPATCH' });
  state = applyWorkflowCommand(state, { type: 'EN_ROUTE' });
  state = applyWorkflowCommand(state, { type: 'START_WORK' });
  state = applyWorkflowCommand(state, {
    type: 'REQUEST_CHANGE',
    id: 'change-1',
    amountDeltaCents: 2500,
  });
  state = applyWorkflowCommand(state, {
    type: 'DECIDE_CHANGE',
    id: 'change-1',
    decision: 'APPROVED',
  });
  state = applyWorkflowCommand(state, { type: 'PARTIAL_WORK' });
  assert.equal(state.workOrder, 'PARTIALLY_COMPLETED');
  state = applyWorkflowCommand(state, { type: 'COMPLETE_WORK' });
  state = applyWorkflowCommand(state, { type: 'ISSUE_INVOICE', totalCents: 12_500 });
  state = applyWorkflowCommand(state, { type: 'CAPTURE_PAYMENT', amountCents: 12_500 });
  state = applyWorkflowCommand(state, { type: 'REFUND', amountCents: 2500 });
  assert.equal(state.payment, 'PARTIALLY_REFUNDED');
  state = applyWorkflowCommand(state, { type: 'REFUND', amountCents: 10_000 });
  assert.equal(state.payment, 'REFUNDED');
  assert.equal(state.invoice, 'REFUNDED');
});

test('no-show can be rescheduled and technician can be reassigned', () => {
  let state = quotedAndConfirmed();
  state = applyWorkflowCommand(state, { type: 'ASSIGN', technicianId: 'tech-1' });
  state = applyWorkflowCommand(state, { type: 'REASSIGN', technicianId: 'tech-2' });
  assert.equal(state.technicianId, 'tech-2');
  state = applyWorkflowCommand(state, { type: 'DISPATCH' });
  state = applyWorkflowCommand(state, { type: 'EN_ROUTE' });
  state = applyWorkflowCommand(state, { type: 'NO_SHOW' });
  state = applyWorkflowCommand(state, {
    type: 'RESCHEDULE',
    startsAt: '2026-08-02T09:00:00.000Z',
    endsAt: '2026-08-02T10:00:00.000Z',
  });
  assert.equal(state.workOrder, 'ASSIGNED');
  assert.equal(state.scheduledStart, '2026-08-02T09:00:00.000Z');
});

test('end-to-end scheduler rejects an overbooked second journey', () => {
  const first = quotedAndConfirmed();
  const second = createWorkflowState(
    '2026-08-01T09:30:00.000Z',
    '2026-08-01T10:30:00.000Z',
  );
  assert.throws(
    () =>
      assertNoOverbooking(
        { startsAt: new Date(second.scheduledStart), endsAt: new Date(second.scheduledEnd) },
        [{ startsAt: new Date(first.scheduledStart), endsAt: new Date(first.scheduledEnd) }],
      ),
    (error: unknown) => error instanceof DomainError && error.code === 'OVERBOOKED',
  );
});

test('offline replay is idempotent and stale revisions conflict', () => {
  const state = quotedAndConfirmed();
  const applied = applyOfflineWorkflowCommand(state, {
    commandId: 'device-command-1',
    expectedVersion: state.version,
    command: { type: 'ASSIGN', technicianId: 'tech-1' },
  });
  assert.equal(
    applyOfflineWorkflowCommand(applied, {
      commandId: 'device-command-1',
      expectedVersion: state.version,
      command: { type: 'ASSIGN', technicianId: 'tech-1' },
    }),
    applied,
  );
  assert.throws(
    () =>
      applyOfflineWorkflowCommand(applied, {
        commandId: 'device-command-2',
        expectedVersion: state.version,
        command: { type: 'DISPATCH' },
      }),
    (error: unknown) => error instanceof DomainError && error.code === 'VERSION_CONFLICT',
  );
});

test('cancellation closes both booking and work order', () => {
  let state = quotedAndConfirmed();
  state = applyWorkflowCommand(state, { type: 'ASSIGN', technicianId: 'tech-1' });
  state = applyWorkflowCommand(state, { type: 'CANCEL_BOOKING' });
  assert.equal(state.booking, 'CANCELLED');
  assert.equal(state.workOrder, 'CANCELLED');
});

