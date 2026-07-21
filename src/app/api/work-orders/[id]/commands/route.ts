import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { WorkOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import {
  assignTechnician,
  decideChangeOrder,
  domainErrorResponse,
  issueInvoice,
  recordOfflineCommand,
  requestChangeOrder,
  reserveInventory,
  rescheduleWorkOrder,
  transitionWorkOrder,
} from '@/lib/field-service/service';

const commandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('transition'),
    expectedVersion: z.number().int().positive(),
    toStatus: z.nativeEnum(WorkOrderStatus),
    note: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal('assign'),
    expectedVersion: z.number().int().positive(),
    technicianId: z.string().min(1),
    reason: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal('reschedule'),
    expectedVersion: z.number().int().positive(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    reason: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal('request-change'),
    expectedVersion: z.number().int().positive(),
    description: z.string().min(1).max(2000),
    amountDeltaCents: z.number().int(),
  }),
  z.object({
    action: z.literal('decide-change'),
    expectedVersion: z.number().int().positive(),
    changeOrderId: z.string().min(1),
    decision: z.enum(['APPROVED', 'REJECTED']),
  }),
  z.object({
    action: z.literal('issue-invoice'),
    expectedVersion: z.number().int().positive(),
  }),
  z.object({
    action: z.literal('reserve-inventory'),
    expectedVersion: z.number().int().positive(),
    itemId: z.string().min(1),
    quantity: z.number().int().positive(),
  }),
  z.object({
    action: z.literal('offline'),
    expectedVersion: z.number().int().positive(),
    deviceId: z.string().min(1).max(200),
    clientCommandId: z.string().min(1).max(200),
    command: z.literal('TRANSITION'),
    payload: z.object({
      toStatus: z.nativeEnum(WorkOrderStatus),
      note: z.string().max(2000).optional(),
    }),
  }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid command', code: 'VALIDATION_ERROR', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const actor = {
    id: session.user.id,
    role: session.user.role,
    businessId: session.user.businessId,
  };
  const { id } = await params;
  try {
    switch (parsed.data.action) {
      case 'transition':
        return NextResponse.json(
          await transitionWorkOrder(
            actor,
            id,
            parsed.data.toStatus,
            parsed.data.expectedVersion,
            parsed.data.note,
          ),
        );
      case 'assign':
        return NextResponse.json(
          await assignTechnician(
            actor,
            id,
            parsed.data.technicianId,
            parsed.data.expectedVersion,
            parsed.data.reason,
          ),
        );
      case 'reschedule':
        return NextResponse.json(
          await rescheduleWorkOrder(
            actor,
            id,
            parsed.data.expectedVersion,
            new Date(parsed.data.scheduledStart),
            new Date(parsed.data.scheduledEnd),
            parsed.data.reason,
          ),
        );
      case 'request-change':
        return NextResponse.json(
          await requestChangeOrder(
            actor,
            id,
            parsed.data.expectedVersion,
            parsed.data.description,
            parsed.data.amountDeltaCents,
          ),
          { status: 201 },
        );
      case 'decide-change':
        return NextResponse.json(
          await decideChangeOrder(
            actor,
            id,
            parsed.data.changeOrderId,
            parsed.data.expectedVersion,
            parsed.data.decision,
          ),
        );
      case 'issue-invoice': {
        const idempotencyKey = request.headers.get('idempotency-key');
        if (!idempotencyKey) {
          return NextResponse.json(
            { error: 'Idempotency-Key header is required', code: 'IDEMPOTENCY_KEY_REQUIRED' },
            { status: 400 },
          );
        }
        return NextResponse.json(
          await issueInvoice(actor, id, parsed.data.expectedVersion, idempotencyKey),
          { status: 201 },
        );
      }
      case 'reserve-inventory':
        return NextResponse.json(
          await reserveInventory(
            actor,
            id,
            parsed.data.itemId,
            parsed.data.quantity,
            parsed.data.expectedVersion,
          ),
          { status: 201 },
        );
      case 'offline':
        return NextResponse.json(
          await recordOfflineCommand(actor, {
            deviceId: parsed.data.deviceId,
            clientCommandId: parsed.data.clientCommandId,
            workOrderId: id,
            expectedVersion: parsed.data.expectedVersion,
            command: parsed.data.command,
            payload: parsed.data.payload,
          }),
          { status: 202 },
        );
    }
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

