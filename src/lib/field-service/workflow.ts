import {
  assertBookingTransition,
  assertChangeOrderTransition,
  assertExpectedVersion,
  assertInvoiceTransition,
  assertPaymentTransition,
  assertQuoteTransition,
  assertRefundAllowed,
  assertWorkOrderTransition,
  BookingState,
  ChangeOrderState,
  DomainError,
  InvoiceState,
  PaymentState,
  QuoteState,
  WorkOrderState,
} from './policy';

export interface WorkflowChangeOrder {
  id: string;
  status: ChangeOrderState;
  amountDeltaCents: number;
}

export interface WorkflowState {
  quote: QuoteState;
  booking: BookingState;
  workOrder: WorkOrderState;
  version: number;
  technicianId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  changeOrders: WorkflowChangeOrder[];
  invoice: InvoiceState;
  invoiceTotalCents: number;
  paidCents: number;
  refundedCents: number;
  payment: PaymentState;
  appliedOfflineCommands: string[];
}

export type WorkflowCommand =
  | { type: 'SEND_QUOTE' }
  | { type: 'ACCEPT_QUOTE' }
  | { type: 'REJECT_QUOTE' }
  | { type: 'CONFIRM_BOOKING' }
  | { type: 'CANCEL_BOOKING' }
  | { type: 'RESCHEDULE'; startsAt: string; endsAt: string }
  | { type: 'ASSIGN'; technicianId: string }
  | { type: 'REASSIGN'; technicianId: string }
  | { type: 'DISPATCH' }
  | { type: 'EN_ROUTE' }
  | { type: 'START_WORK' }
  | { type: 'PAUSE_WORK' }
  | { type: 'PARTIAL_WORK' }
  | { type: 'COMPLETE_WORK' }
  | { type: 'NO_SHOW' }
  | { type: 'REQUEST_CHANGE'; id: string; amountDeltaCents: number }
  | { type: 'DECIDE_CHANGE'; id: string; decision: 'APPROVED' | 'REJECTED' }
  | { type: 'ISSUE_INVOICE'; totalCents: number }
  | { type: 'CAPTURE_PAYMENT'; amountCents: number }
  | { type: 'REFUND'; amountCents: number };

export interface OfflineWorkflowCommand {
  commandId: string;
  expectedVersion: number;
  command: WorkflowCommand;
}

export function createWorkflowState(startsAt: string, endsAt: string): WorkflowState {
  if (new Date(startsAt) >= new Date(endsAt)) {
    throw new DomainError('INVALID_TIME_RANGE', 'Start must be before end', 400);
  }
  return {
    quote: 'PENDING',
    booking: 'PENDING',
    workOrder: 'SCHEDULED',
    version: 1,
    scheduledStart: startsAt,
    scheduledEnd: endsAt,
    changeOrders: [],
    invoice: 'DRAFT',
    invoiceTotalCents: 0,
    paidCents: 0,
    refundedCents: 0,
    payment: 'REQUIRES_ACTION',
    appliedOfflineCommands: [],
  };
}

function bump(state: WorkflowState, changes: Partial<WorkflowState>): WorkflowState {
  return { ...state, ...changes, version: state.version + 1 };
}

export function applyWorkflowCommand(
  state: WorkflowState,
  command: WorkflowCommand,
): WorkflowState {
  switch (command.type) {
    case 'SEND_QUOTE':
      assertQuoteTransition(state.quote, 'SENT');
      return bump(state, { quote: 'SENT' });
    case 'ACCEPT_QUOTE':
      assertQuoteTransition(state.quote, 'ACCEPTED');
      return bump(state, { quote: 'ACCEPTED' });
    case 'REJECT_QUOTE':
      assertQuoteTransition(state.quote, 'REJECTED');
      return bump(state, { quote: 'REJECTED' });
    case 'CONFIRM_BOOKING':
      if (state.quote !== 'ACCEPTED') {
        throw new DomainError('QUOTE_NOT_ACCEPTED', 'A booking requires an accepted quote');
      }
      assertBookingTransition(state.booking, 'CONFIRMED');
      return bump(state, { booking: 'CONFIRMED' });
    case 'CANCEL_BOOKING':
      assertBookingTransition(state.booking, 'CANCELLED');
      if (state.workOrder !== 'CANCELLED') {
        assertWorkOrderTransition(state.workOrder, 'CANCELLED');
      }
      return bump(state, { booking: 'CANCELLED', workOrder: 'CANCELLED' });
    case 'RESCHEDULE': {
      if (!['PENDING', 'CONFIRMED'].includes(state.booking)) {
        throw new DomainError('RESCHEDULE_NOT_ALLOWED', 'This booking can no longer be rescheduled');
      }
      if (new Date(command.startsAt) >= new Date(command.endsAt)) {
        throw new DomainError('INVALID_TIME_RANGE', 'Start must be before end', 400);
      }
      const resetState: WorkOrderState = state.technicianId ? 'ASSIGNED' : 'SCHEDULED';
      return bump(state, {
        scheduledStart: command.startsAt,
        scheduledEnd: command.endsAt,
        workOrder: resetState,
      });
    }
    case 'ASSIGN':
      assertWorkOrderTransition(state.workOrder, 'ASSIGNED');
      return bump(state, { technicianId: command.technicianId, workOrder: 'ASSIGNED' });
    case 'REASSIGN':
      if (!['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'].includes(state.workOrder)) {
        throw new DomainError('REASSIGN_NOT_ALLOWED', 'The job cannot be reassigned now');
      }
      return bump(state, { technicianId: command.technicianId, workOrder: 'ASSIGNED' });
    case 'DISPATCH':
      assertWorkOrderTransition(state.workOrder, 'DISPATCHED');
      return bump(state, { workOrder: 'DISPATCHED' });
    case 'EN_ROUTE':
      assertWorkOrderTransition(state.workOrder, 'EN_ROUTE');
      return bump(state, { workOrder: 'EN_ROUTE' });
    case 'START_WORK':
      assertWorkOrderTransition(state.workOrder, 'IN_PROGRESS');
      return bump(state, { workOrder: 'IN_PROGRESS' });
    case 'PAUSE_WORK':
      assertWorkOrderTransition(state.workOrder, 'PAUSED');
      return bump(state, { workOrder: 'PAUSED' });
    case 'PARTIAL_WORK':
      assertWorkOrderTransition(state.workOrder, 'PARTIALLY_COMPLETED');
      return bump(state, { workOrder: 'PARTIALLY_COMPLETED' });
    case 'COMPLETE_WORK':
      assertWorkOrderTransition(state.workOrder, 'COMPLETED');
      return bump(state, { workOrder: 'COMPLETED', booking: 'COMPLETED' });
    case 'NO_SHOW':
      assertWorkOrderTransition(state.workOrder, 'NO_SHOW');
      return bump(state, { workOrder: 'NO_SHOW' });
    case 'REQUEST_CHANGE': {
      if (!['IN_PROGRESS', 'PAUSED', 'PARTIALLY_COMPLETED'].includes(state.workOrder)) {
        throw new DomainError('CHANGE_ORDER_NOT_ALLOWED', 'Work must be underway');
      }
      if (!Number.isSafeInteger(command.amountDeltaCents)) {
        throw new DomainError('INVALID_MONEY', 'Change amount must use integer cents', 400);
      }
      return bump(state, {
        changeOrders: [
          ...state.changeOrders,
          { id: command.id, status: 'PENDING_CUSTOMER', amountDeltaCents: command.amountDeltaCents },
        ],
      });
    }
    case 'DECIDE_CHANGE': {
      const change = state.changeOrders.find((item) => item.id === command.id);
      if (!change) throw new DomainError('CHANGE_ORDER_NOT_FOUND', 'Change order not found', 404);
      assertChangeOrderTransition(change.status, command.decision);
      return bump(state, {
        changeOrders: state.changeOrders.map((item) =>
          item.id === command.id ? { ...item, status: command.decision } : item,
        ),
      });
    }
    case 'ISSUE_INVOICE':
      if (state.workOrder !== 'COMPLETED' && state.workOrder !== 'PARTIALLY_COMPLETED') {
        throw new DomainError('WORK_NOT_BILLABLE', 'Work must be completed or partially completed');
      }
      if (!Number.isSafeInteger(command.totalCents) || command.totalCents < 0) {
        throw new DomainError('INVALID_MONEY', 'Invoice total must use non-negative integer cents', 400);
      }
      assertInvoiceTransition(state.invoice, 'OPEN');
      return bump(state, { invoice: 'OPEN', invoiceTotalCents: command.totalCents });
    case 'CAPTURE_PAYMENT': {
      if (!['OPEN', 'PARTIALLY_PAID'].includes(state.invoice)) {
        throw new DomainError('INVOICE_NOT_PAYABLE', 'Invoice is not open for payment');
      }
      if (
        !Number.isSafeInteger(command.amountCents) ||
        command.amountCents <= 0 ||
        state.paidCents + command.amountCents > state.invoiceTotalCents
      ) {
        throw new DomainError('INVALID_PAYMENT_TOTAL', 'Payment exceeds the invoice balance', 400);
      }
      if (state.payment === 'REQUIRES_ACTION') {
        assertPaymentTransition(state.payment, 'CAPTURED');
      }
      const paidCents = state.paidCents + command.amountCents;
      return bump(state, {
        paidCents,
        invoice: paidCents === state.invoiceTotalCents ? 'PAID' : 'PARTIALLY_PAID',
        payment: 'CAPTURED',
      });
    }
    case 'REFUND': {
      assertRefundAllowed(state.paidCents, state.refundedCents, command.amountCents);
      const refundedCents = state.refundedCents + command.amountCents;
      const payment = refundedCents === state.paidCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      assertPaymentTransition(state.payment, payment);
      return bump(state, {
        refundedCents,
        payment,
        invoice: refundedCents === state.invoiceTotalCents ? 'REFUNDED' : 'PARTIALLY_PAID',
      });
    }
  }
}

export function applyOfflineWorkflowCommand(
  state: WorkflowState,
  offline: OfflineWorkflowCommand,
): WorkflowState {
  if (state.appliedOfflineCommands.includes(offline.commandId)) return state;
  assertExpectedVersion(state.version, offline.expectedVersion);
  const applied = applyWorkflowCommand(state, offline.command);
  return {
    ...applied,
    appliedOfflineCommands: [...applied.appliedOfflineCommands, offline.commandId],
  };
}

