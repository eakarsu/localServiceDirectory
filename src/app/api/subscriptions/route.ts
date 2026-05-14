// Subscription tiers and lead-scoring for premium providers.
// TODO: configure credentials — STRIPE_SECRET_KEY, STRIPE_PRICE_BRONZE/SILVER/GOLD.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const TIERS = [
  { id: 'bronze', name: 'Bronze', monthlyUSD: 0, leadBoost: 1.0 },
  { id: 'silver', name: 'Silver', monthlyUSD: 29, leadBoost: 1.5 },
  { id: 'gold', name: 'Gold', monthlyUSD: 99, leadBoost: 2.5 }
];

let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  } catch {}
}

// In-memory provider tier registry.
const providerTiers = new Map<string, string>();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { action } = body;

  if (action === 'subscribe') {
    const { businessId, tierId, customerEmail } = body;
    const tier = TIERS.find(t => t.id === tierId);
    if (!tier) return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
    if (tier.monthlyUSD === 0) {
      providerTiers.set(businessId, tier.id);
      return NextResponse.json({ ok: true, tier: tier.id });
    }
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    const priceId = process.env[`STRIPE_PRICE_${tier.id.toUpperCase()}`];
    if (!priceId) return NextResponse.json({ error: `STRIPE_PRICE_${tier.id.toUpperCase()} missing` }, { status: 503 });
    const sessionStripe = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: { businessId, tierId }
    });
    return NextResponse.json({ checkoutUrl: sessionStripe.url });
  }

  if (action === 'lead-score') {
    const { businessId, leadValue = 100 } = body;
    const tierId = providerTiers.get(businessId) || 'bronze';
    const tier = TIERS.find(t => t.id === tierId)!;
    return NextResponse.json({
      businessId,
      tier: tierId,
      boostedScore: Math.round(leadValue * tier.leadBoost)
    });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  if (businessId) {
    return NextResponse.json({ businessId, tier: providerTiers.get(businessId) || 'bronze', tiers: TIERS });
  }
  return NextResponse.json({ tiers: TIERS });
}
