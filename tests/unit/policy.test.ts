import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertInsideAvailability,
  assertInventoryAvailable,
  assertNoOverbooking,
  assertRefundAllowed,
  assertRequiredSkills,
  assertWithinTravelLimit,
  calculateInvoice,
  distanceMiles,
  DomainError,
  overlaps,
} from '../../src/lib/field-service/policy';

const range = (start: string, end: string) => ({
  startsAt: new Date(start),
  endsAt: new Date(end),
});

function expectDomainCode(action: () => unknown, code: string) {
  assert.throws(action, (error: unknown) => error instanceof DomainError && error.code === code);
}

test('overlap uses half-open ranges and enforces capacity', () => {
  const nine = range('2026-08-01T09:00:00.000Z', '2026-08-01T10:00:00.000Z');
  const ten = range('2026-08-01T10:00:00.000Z', '2026-08-01T11:00:00.000Z');
  const overlap = range('2026-08-01T09:30:00.000Z', '2026-08-01T10:30:00.000Z');
  assert.equal(overlaps(nine, ten), false);
  assert.equal(overlaps(nine, overlap), true);
  assertNoOverbooking(overlap, [nine], 2);
  expectDomainCode(() => assertNoOverbooking(overlap, [nine], 1), 'OVERBOOKED');

  const fullWindow = range('2026-08-01T09:00:00.000Z', '2026-08-01T11:00:00.000Z');
  assertNoOverbooking(fullWindow, [nine, ten], 2);
  expectDomainCode(
    () =>
      assertNoOverbooking(
        fullWindow,
        [nine, range('2026-08-01T09:15:00.000Z', '2026-08-01T10:15:00.000Z')],
        2,
      ),
    'OVERBOOKED',
  );
});

test('availability must fully contain the requested service slot', () => {
  const window = {
    ...range('2026-08-01T08:00:00.000Z', '2026-08-01T17:00:00.000Z'),
    capacity: 2,
    available: true,
  };
  assert.equal(
    assertInsideAvailability(
      range('2026-08-01T09:00:00.000Z', '2026-08-01T10:00:00.000Z'),
      [window],
    ),
    window,
  );
  expectDomainCode(
    () =>
      assertInsideAvailability(
        range('2026-08-01T16:30:00.000Z', '2026-08-01T17:30:00.000Z'),
        [window],
      ),
    'OUTSIDE_AVAILABILITY',
  );
});

test('skills, travel limits, and inventory fail closed', () => {
  assertRequiredSkills(['plumbing', 'gas'], ['Gas', 'Plumbing', 'safety']);
  expectDomainCode(() => assertRequiredSkills(['gas'], ['plumbing']), 'MISSING_SKILLS');
  const nyc = { latitude: 40.7128, longitude: -74.006 };
  const philadelphia = { latitude: 39.9526, longitude: -75.1652 };
  assert.ok(distanceMiles(nyc, philadelphia) > 75);
  expectDomainCode(
    () => assertWithinTravelLimit(nyc, philadelphia, 50),
    'OUTSIDE_SERVICE_AREA',
  );
  assertInventoryAvailable(3, 10, 7);
  expectDomainCode(() => assertInventoryAvailable(4, 10, 7), 'INSUFFICIENT_INVENTORY');
});

test('invoice and refund calculations only accept bounded integer cents', () => {
  assert.deepEqual(calculateInvoice([10_000, 2_500], 825), {
    subtotalCents: 12_500,
    taxCents: 1_031,
    totalCents: 13_531,
  });
  expectDomainCode(() => calculateInvoice([10.5], 0), 'INVALID_MONEY');
  assertRefundAllowed(10_000, 2_000, 8_000);
  expectDomainCode(() => assertRefundAllowed(10_000, 2_000, 8_001), 'INVALID_REFUND');
});
