export type QuoteState =
  | 'DRAFT'
  | 'PENDING'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type BookingState = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type WorkOrderState =
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'PARTIALLY_COMPLETED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type ChangeOrderState =
  | 'DRAFT'
  | 'PENDING_CUSTOMER'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type InvoiceState =
  | 'DRAFT'
  | 'OPEN'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'VOID'
  | 'REFUNDED';

export type PaymentState =
  | 'REQUIRES_ACTION'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED';

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 409,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

const quoteTransitions: Record<QuoteState, readonly QuoteState[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  PENDING: ['SENT', 'CANCELLED'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

const bookingTransitions: Record<BookingState, readonly BookingState[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const workOrderTransitions: Record<WorkOrderState, readonly WorkOrderState[]> = {
  SCHEDULED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['DISPATCHED', 'SCHEDULED', 'CANCELLED'],
  DISPATCHED: ['EN_ROUTE', 'ASSIGNED', 'CANCELLED'],
  EN_ROUTE: ['IN_PROGRESS', 'NO_SHOW', 'ASSIGNED', 'CANCELLED'],
  IN_PROGRESS: ['PAUSED', 'PARTIALLY_COMPLETED', 'COMPLETED'],
  PAUSED: ['IN_PROGRESS', 'PARTIALLY_COMPLETED', 'CANCELLED'],
  PARTIALLY_COMPLETED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  NO_SHOW: ['SCHEDULED', 'CANCELLED'],
  CANCELLED: [],
};

const changeOrderTransitions: Record<ChangeOrderState, readonly ChangeOrderState[]> = {
  DRAFT: ['PENDING_CUSTOMER', 'CANCELLED'],
  PENDING_CUSTOMER: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

const invoiceTransitions: Record<InvoiceState, readonly InvoiceState[]> = {
  DRAFT: ['OPEN', 'VOID'],
  OPEN: ['PARTIALLY_PAID', 'PAID', 'VOID'],
  PARTIALLY_PAID: ['PAID', 'REFUNDED'],
  PAID: ['PARTIALLY_PAID', 'REFUNDED'],
  VOID: [],
  REFUNDED: [],
};

const paymentTransitions: Record<PaymentState, readonly PaymentState[]> = {
  REQUIRES_ACTION: ['AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED'],
  AUTHORIZED: ['CAPTURED', 'FAILED', 'CANCELLED'],
  CAPTURED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  REFUNDED: [],
  FAILED: [],
  CANCELLED: [],
};

function assertTransition<T extends string>(
  kind: string,
  transitions: Record<T, readonly T[]>,
  from: T,
  to: T,
): void {
  if (from === to || !transitions[from]?.includes(to)) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `${kind} cannot transition from ${from} to ${to}`,
    );
  }
}

export const assertQuoteTransition = (from: QuoteState, to: QuoteState) =>
  assertTransition('Quote', quoteTransitions, from, to);

export const assertBookingTransition = (from: BookingState, to: BookingState) =>
  assertTransition('Booking', bookingTransitions, from, to);

export const assertWorkOrderTransition = (from: WorkOrderState, to: WorkOrderState) =>
  assertTransition('Work order', workOrderTransitions, from, to);

export const assertChangeOrderTransition = (from: ChangeOrderState, to: ChangeOrderState) =>
  assertTransition('Change order', changeOrderTransitions, from, to);

export const assertInvoiceTransition = (from: InvoiceState, to: InvoiceState) =>
  assertTransition('Invoice', invoiceTransitions, from, to);

export const assertPaymentTransition = (from: PaymentState, to: PaymentState) =>
  assertTransition('Payment', paymentTransitions, from, to);

export interface TimeRange {
  startsAt: Date;
  endsAt: Date;
}

export function assertTimeRange(range: TimeRange): void {
  if (
    Number.isNaN(range.startsAt.getTime()) ||
    Number.isNaN(range.endsAt.getTime()) ||
    range.startsAt >= range.endsAt
  ) {
    throw new DomainError('INVALID_TIME_RANGE', 'Start must be before end', 400);
  }
}

export function overlaps(left: TimeRange, right: TimeRange): boolean {
  assertTimeRange(left);
  assertTimeRange(right);
  return left.startsAt < right.endsAt && right.startsAt < left.endsAt;
}

export function assertNoOverbooking(
  candidate: TimeRange,
  existing: readonly TimeRange[],
  capacity = 1,
): void {
  assertTimeRange(candidate);
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new DomainError('INVALID_CAPACITY', 'Capacity must be a positive integer', 400);
  }
  const events: { at: number; delta: 1 | -1 }[] = [];
  for (const range of existing) {
    assertTimeRange(range);
    if (!overlaps(candidate, range)) continue;
    events.push({ at: Math.max(candidate.startsAt.getTime(), range.startsAt.getTime()), delta: 1 });
    events.push({ at: Math.min(candidate.endsAt.getTime(), range.endsAt.getTime()), delta: -1 });
  }
  // End events sort before start events so adjacent half-open ranges do not overlap.
  events.sort((left, right) => left.at - right.at || left.delta - right.delta);
  let simultaneous = 0;
  for (const event of events) {
    simultaneous += event.delta;
    if (simultaneous >= capacity) {
      throw new DomainError('OVERBOOKED', 'The requested time is no longer available');
    }
  }
}

export interface AvailabilityRange extends TimeRange {
  capacity: number;
  available: boolean;
}

export function assertInsideAvailability(
  candidate: TimeRange,
  windows: readonly AvailabilityRange[],
): AvailabilityRange {
  assertTimeRange(candidate);
  const window = windows.find(
    (item) =>
      item.available &&
      candidate.startsAt >= item.startsAt &&
      candidate.endsAt <= item.endsAt,
  );
  if (!window) {
    throw new DomainError('OUTSIDE_AVAILABILITY', 'No availability covers the requested time');
  }
  return window;
}

export function assertRequiredSkills(
  required: readonly string[],
  technicianSkills: readonly string[],
): void {
  const available = new Set(technicianSkills.map((skill) => skill.toLowerCase()));
  const missing = required.filter((skill) => !available.has(skill.toLowerCase()));
  if (missing.length > 0) {
    throw new DomainError(
      'MISSING_SKILLS',
      `Technician is missing required skills: ${missing.join(', ')}`,
    );
  }
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceMiles(from: Coordinates, to: Coordinates): number {
  for (const point of [from, to]) {
    if (
      !Number.isFinite(point.latitude) ||
      !Number.isFinite(point.longitude) ||
      Math.abs(point.latitude) > 90 ||
      Math.abs(point.longitude) > 180
    ) {
      throw new DomainError('INVALID_COORDINATES', 'Coordinates are invalid', 400);
    }
  }

  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
}

export function assertWithinTravelLimit(
  origin: Coordinates,
  destination: Coordinates,
  maxMiles: number,
): number {
  if (!Number.isFinite(maxMiles) || maxMiles <= 0) {
    throw new DomainError('INVALID_TRAVEL_LIMIT', 'Travel limit must be positive', 400);
  }
  const miles = distanceMiles(origin, destination);
  if (miles > maxMiles) {
    throw new DomainError(
      'OUTSIDE_SERVICE_AREA',
      `Destination is ${miles.toFixed(1)} miles away; limit is ${maxMiles} miles`,
    );
  }
  return miles;
}

export function assertInventoryAvailable(
  requested: number,
  onHand: number,
  alreadyReserved: number,
): void {
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new DomainError('INVALID_QUANTITY', 'Quantity must be a positive integer', 400);
  }
  if (onHand - alreadyReserved < requested) {
    throw new DomainError('INSUFFICIENT_INVENTORY', 'Inventory is not available');
  }
}

export interface InvoiceAmounts {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function calculateInvoice(
  lineAmountsCents: readonly number[],
  taxRateBasisPoints: number,
): InvoiceAmounts {
  if (
    lineAmountsCents.some((amount) => !Number.isSafeInteger(amount)) ||
    !Number.isInteger(taxRateBasisPoints) ||
    taxRateBasisPoints < 0
  ) {
    throw new DomainError('INVALID_MONEY', 'Invoice amounts must be integer cents', 400);
  }
  const subtotalCents = lineAmountsCents.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new DomainError('INVALID_MONEY', 'Invoice subtotal is invalid', 400);
  }
  const taxCents = Math.round((subtotalCents * taxRateBasisPoints) / 10_000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export function nextInvoiceStatus(totalCents: number, paidCents: number): InvoiceState {
  if (paidCents < 0 || totalCents < 0 || paidCents > totalCents) {
    throw new DomainError('INVALID_PAYMENT_TOTAL', 'Paid amount is outside invoice bounds', 400);
  }
  if (paidCents === 0) return 'OPEN';
  if (paidCents < totalCents) return 'PARTIALLY_PAID';
  return 'PAID';
}

export function assertRefundAllowed(
  capturedCents: number,
  alreadyRefundedCents: number,
  requestedCents: number,
): void {
  if (
    !Number.isSafeInteger(requestedCents) ||
    requestedCents <= 0 ||
    requestedCents > capturedCents - alreadyRefundedCents
  ) {
    throw new DomainError('INVALID_REFUND', 'Refund exceeds the remaining captured amount', 400);
  }
}

export function assertExpectedVersion(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new DomainError(
      'VERSION_CONFLICT',
      `Expected version ${expected}, current version is ${actual}`,
    );
  }
}
