// Escrow payments with milestone release.
// TODO: configure credentials — STRIPE_SECRET_KEY.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type Milestone = { id: string; description: string; amountCents: number; status: 'pending' | 'released' | 'disputed' };
type Escrow = {
  id: string;
  bookingId: string;
  buyer: string;
  seller: string;
  total: number;
  status: 'open' | 'fully_released' | 'disputed';
  milestones: Milestone[];
  stripePaymentIntentId?: string;
  createdAt: Date;
};

const escrows = new Map<string, Escrow>();

let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  } catch {}
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const { bookingId, buyer, seller, milestones = [] } = body;
    if (!bookingId || !buyer || !seller || !milestones.length) {
      return NextResponse.json({ error: 'bookingId, buyer, seller, milestones required' }, { status: 400 });
    }
    const total = milestones.reduce((s: number, m: any) => s + (m.amountCents || 0), 0);
    let pi: any = null;
    if (stripe) {
      pi = await stripe.paymentIntents.create({ amount: total, currency: 'usd', capture_method: 'manual', metadata: { bookingId } });
    }
    const id = `esc_${Date.now()}`;
    const escrow: Escrow = {
      id, bookingId, buyer, seller, total,
      status: 'open',
      milestones: milestones.map((m: any, i: number) => ({ id: `m${i + 1}`, description: m.description, amountCents: m.amountCents, status: 'pending' })),
      stripePaymentIntentId: pi?.id,
      createdAt: new Date()
    };
    escrows.set(id, escrow);
    return NextResponse.json(escrow);
  }

  if (action === 'release-milestone') {
    const e = escrows.get(body.escrowId);
    if (!e) return NextResponse.json({ error: 'escrow not found' }, { status: 404 });
    const m = e.milestones.find(m => m.id === body.milestoneId);
    if (!m) return NextResponse.json({ error: 'milestone not found' }, { status: 404 });
    m.status = 'released';
    if (stripe && e.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.capture(e.stripePaymentIntentId, { amount_to_capture: m.amountCents });
      } catch (err: any) {
        return NextResponse.json({ error: 'capture failed', detail: err.message }, { status: 502 });
      }
    }
    if (e.milestones.every(x => x.status === 'released')) e.status = 'fully_released';
    return NextResponse.json(e);
  }

  if (action === 'dispute') {
    const e = escrows.get(body.escrowId);
    if (!e) return NextResponse.json({ error: 'escrow not found' }, { status: 404 });
    e.status = 'disputed';
    return NextResponse.json(e);
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const bookingId = req.nextUrl.searchParams.get('bookingId');
  const list = [...escrows.values()].filter(e => !bookingId || e.bookingId === bookingId);
  return NextResponse.json({ count: list.length, escrows: list });
}
