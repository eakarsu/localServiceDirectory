export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: 'NOT_CONFIGURED' | 'REJECTED' | 'UNAVAILABLE' | 'INVALID_RESPONSE',
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface ProviderResult {
  providerReference: string;
  raw?: unknown;
}

export interface MapsProvider {
  geocode(address: string, idempotencyKey: string): Promise<ProviderResult & {
    latitude: number;
    longitude: number;
  }>;
  route(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    idempotencyKey: string,
  ): Promise<ProviderResult & { distanceMiles: number; durationMinutes: number }>;
}

export interface CalendarProvider {
  upsertEvent(input: {
    externalId?: string;
    title: string;
    startsAt: string;
    endsAt: string;
    attendees: string[];
    idempotencyKey: string;
  }): Promise<ProviderResult>;
  cancelEvent(externalId: string, idempotencyKey: string): Promise<ProviderResult>;
}

export interface MessagingProvider {
  send(input: {
    channel: 'EMAIL' | 'SMS' | 'PUSH';
    recipient: string;
    templateKey: string;
    variables: Record<string, string>;
    idempotencyKey: string;
  }): Promise<ProviderResult>;
}

export interface PaymentProvider {
  authorize(input: {
    amountCents: number;
    currency: string;
    customerReference: string;
    idempotencyKey: string;
  }): Promise<ProviderResult & { status: 'REQUIRES_ACTION' | 'AUTHORIZED' }>;
  capture(input: {
    paymentReference: string;
    amountCents: number;
    idempotencyKey: string;
  }): Promise<ProviderResult>;
  refund(input: {
    paymentReference: string;
    amountCents: number;
    reason?: string;
    idempotencyKey: string;
  }): Promise<ProviderResult>;
}

export interface TaxProvider {
  calculate(input: {
    amountCents: number;
    currency: string;
    destination: { country: string; state?: string; postalCode?: string };
    idempotencyKey: string;
  }): Promise<ProviderResult & { taxCents: number }>;
}

export interface AccountingProvider {
  syncInvoice(input: {
    invoiceNumber: string;
    totalCents: number;
    taxCents: number;
    currency: string;
    status: string;
    idempotencyKey: string;
  }): Promise<ProviderResult>;
  syncPayment(input: {
    invoiceNumber: string;
    amountCents: number;
    currency: string;
    paymentReference: string;
    idempotencyKey: string;
  }): Promise<ProviderResult>;
}

interface HttpProviderConfig {
  provider: string;
  baseUrl?: string;
  apiKey?: string;
}

async function callProvider<T>(
  config: HttpProviderConfig,
  path: string,
  payload: unknown,
  idempotencyKey: string,
): Promise<T> {
  if (!config.baseUrl || !config.apiKey) {
    throw new ProviderError(
      config.provider,
      'NOT_CONFIGURED',
      `${config.provider} is not configured`,
      false,
    );
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(config.baseUrl);
  } catch {
    throw new ProviderError(
      config.provider,
      'NOT_CONFIGURED',
      `${config.provider} base URL is invalid`,
      false,
    );
  }
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname);
  if (baseUrl.protocol !== 'https:' && !(baseUrl.protocol === 'http:' && loopback)) {
    throw new ProviderError(
      config.provider,
      'NOT_CONFIGURED',
      `${config.provider} base URL must use HTTPS`,
      false,
    );
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ProviderError(config.provider, 'UNAVAILABLE', `${config.provider} is unavailable`, true);
  }

  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new ProviderError(
      config.provider,
      retryable ? 'UNAVAILABLE' : 'REJECTED',
      `${config.provider} rejected the request (${response.status})`,
      retryable,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ProviderError(
      config.provider,
      'INVALID_RESPONSE',
      `${config.provider} returned an invalid response`,
      false,
    );
  }
}

function reference(value: unknown, provider: string): string {
  if (!value || typeof value !== 'object') {
    throw new ProviderError(provider, 'INVALID_RESPONSE', 'Provider reference is missing', false);
  }
  const candidate = (value as Record<string, unknown>).id ??
    (value as Record<string, unknown>).providerReference;
  if (typeof candidate !== 'string' || candidate.length === 0) {
    throw new ProviderError(provider, 'INVALID_RESPONSE', 'Provider reference is missing', false);
  }
  return candidate;
}

export function createHttpProviders(
  environment: Record<string, string | undefined> = process.env,
): {
  maps: MapsProvider;
  calendar: CalendarProvider;
  messaging: MessagingProvider;
  payment: PaymentProvider;
  tax: TaxProvider;
  accounting: AccountingProvider;
} {
  const maps = {
    provider: environment.MAPS_PROVIDER ?? 'maps',
    baseUrl: environment.MAPS_API_URL,
    apiKey: environment.MAPS_API_KEY,
  };
  const calendar = {
    provider: environment.CALENDAR_PROVIDER ?? 'calendar',
    baseUrl: environment.CALENDAR_API_URL,
    apiKey: environment.CALENDAR_API_KEY,
  };
  const messaging = {
    provider: environment.MESSAGING_PROVIDER ?? 'messaging',
    baseUrl: environment.MESSAGING_API_URL,
    apiKey: environment.MESSAGING_API_KEY,
  };
  const payment = {
    provider: environment.PAYMENT_PROVIDER ?? 'payment',
    baseUrl: environment.PAYMENT_API_URL,
    apiKey: environment.PAYMENT_API_KEY,
  };
  const tax = {
    provider: environment.TAX_PROVIDER ?? 'tax',
    baseUrl: environment.TAX_API_URL,
    apiKey: environment.TAX_API_KEY,
  };
  const accounting = {
    provider: environment.ACCOUNTING_PROVIDER ?? 'accounting',
    baseUrl: environment.ACCOUNTING_API_URL,
    apiKey: environment.ACCOUNTING_API_KEY,
  };

  return {
    maps: {
      async geocode(address, idempotencyKey) {
        const result = await callProvider<Record<string, unknown>>(
          maps,
          '/geocode',
          { address },
          idempotencyKey,
        );
        const latitude = Number(result.latitude);
        const longitude = Number(result.longitude);
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          throw new ProviderError(maps.provider, 'INVALID_RESPONSE', 'Coordinates are missing', false);
        }
        return { providerReference: reference(result, maps.provider), latitude, longitude, raw: result };
      },
      async route(origin, destination, idempotencyKey) {
        const result = await callProvider<Record<string, unknown>>(
          maps,
          '/route',
          { origin, destination },
          idempotencyKey,
        );
        const distance = Number(result.distanceMiles);
        const duration = Number(result.durationMinutes);
        if (
          !Number.isFinite(distance) ||
          !Number.isFinite(duration) ||
          distance < 0 ||
          duration < 0
        ) {
          throw new ProviderError(maps.provider, 'INVALID_RESPONSE', 'Route metrics are missing', false);
        }
        return {
          providerReference: reference(result, maps.provider),
          distanceMiles: distance,
          durationMinutes: duration,
          raw: result,
        };
      },
    },
    calendar: {
      async upsertEvent(input) {
        const result = await callProvider<Record<string, unknown>>(
          calendar,
          '/events/upsert',
          input,
          input.idempotencyKey,
        );
        return { providerReference: reference(result, calendar.provider), raw: result };
      },
      async cancelEvent(externalId, idempotencyKey) {
        const result = await callProvider<Record<string, unknown>>(
          calendar,
          '/events/cancel',
          { externalId },
          idempotencyKey,
        );
        return { providerReference: reference(result, calendar.provider), raw: result };
      },
    },
    messaging: {
      async send(input) {
        const result = await callProvider<Record<string, unknown>>(
          messaging,
          '/messages/send',
          input,
          input.idempotencyKey,
        );
        return { providerReference: reference(result, messaging.provider), raw: result };
      },
    },
    payment: {
      async authorize(input) {
        const result = await callProvider<Record<string, unknown>>(
          payment,
          '/payments/authorize',
          input,
          input.idempotencyKey,
        );
        const status = result.status;
        if (status !== 'REQUIRES_ACTION' && status !== 'AUTHORIZED') {
          throw new ProviderError(payment.provider, 'INVALID_RESPONSE', 'Payment status is invalid', false);
        }
        return { providerReference: reference(result, payment.provider), status, raw: result };
      },
      async capture(input) {
        const result = await callProvider<Record<string, unknown>>(
          payment,
          '/payments/capture',
          input,
          input.idempotencyKey,
        );
        return { providerReference: reference(result, payment.provider), raw: result };
      },
      async refund(input) {
        const result = await callProvider<Record<string, unknown>>(
          payment,
          '/payments/refund',
          input,
          input.idempotencyKey,
        );
        return { providerReference: reference(result, payment.provider), raw: result };
      },
    },
    tax: {
      async calculate(input) {
        const result = await callProvider<Record<string, unknown>>(
          tax,
          '/tax/calculate',
          input,
          input.idempotencyKey,
        );
        const taxCents = Number(result.taxCents);
        if (!Number.isSafeInteger(taxCents) || taxCents < 0) {
          throw new ProviderError(tax.provider, 'INVALID_RESPONSE', 'Tax amount is invalid', false);
        }
        return { providerReference: reference(result, tax.provider), taxCents, raw: result };
      },
    },
    accounting: {
      async syncInvoice(input) {
        const result = await callProvider<Record<string, unknown>>(
          accounting,
          '/invoices/sync',
          input,
          input.idempotencyKey,
        );
        return { providerReference: reference(result, accounting.provider), raw: result };
      },
      async syncPayment(input) {
        const result = await callProvider<Record<string, unknown>>(
          accounting,
          '/payments/sync',
          input,
          input.idempotencyKey,
        );
        return { providerReference: reference(result, accounting.provider), raw: result };
      },
    },
  };
}
