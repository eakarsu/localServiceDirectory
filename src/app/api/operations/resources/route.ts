import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { domainErrorResponse } from '@/lib/field-service/service';
import { DomainError } from '@/lib/field-service/policy';

const resourceCommand = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create-skill'),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('create-technician'),
    name: z.string().min(1).max(200),
    phone: z.string().max(50).optional(),
    userId: z.string().min(1).optional(),
    skillIds: z.array(z.string().min(1)).max(50).default([]),
    homeLatitude: z.number().min(-90).max(90).optional(),
    homeLongitude: z.number().min(-180).max(180).optional(),
    maxTravelMiles: z.number().int().positive().max(1000).optional(),
  }),
  z.object({
    action: z.literal('publish-availability'),
    technicianId: z.string().min(1).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    capacity: z.number().int().positive().max(100).default(1),
  }),
  z.object({
    action: z.literal('upsert-inventory'),
    sku: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    onHandQuantity: z.number().int().nonnegative(),
    reorderPoint: z.number().int().nonnegative().default(0),
  }),
  z.object({
    action: z.literal('set-service-skills'),
    serviceId: z.string().min(1),
    skillIds: z.array(z.string().min(1)).max(50),
  }),
  z.object({
    action: z.literal('upsert-service-area'),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    zipCode: z.string().max(20).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusMiles: z.number().int().positive().max(1000).optional(),
  }),
]);

interface ResourceSession {
  user: { id: string; role: string; businessId?: string };
}

async function businessForSession(session: ResourceSession) {
  if (!session.user.businessId) {
    throw new DomainError('BUSINESS_REQUIRED', 'A business-owner account is required', 403);
  }
  const business = await prisma.business.findFirst({
    where: {
      id: session.user.businessId,
      ...(session.user.role === 'ADMIN' ? {} : { ownerId: session.user.id }),
    },
  });
  if (!business) throw new DomainError('FORBIDDEN', 'Business access denied', 403);
  return business;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const business = await businessForSession(session);
    const [technicians, availability, inventory, serviceAreas, skills] = await Promise.all([
      prisma.technician.findMany({
        where: { businessId: business.id },
        include: { skills: true },
        orderBy: { name: 'asc' },
      }),
      prisma.availabilityWindow.findMany({
        where: { businessId: business.id, endsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
      }),
      prisma.inventoryItem.findMany({ where: { businessId: business.id }, orderBy: { sku: 'asc' } }),
      prisma.serviceArea.findMany({ where: { businessId: business.id }, orderBy: { city: 'asc' } }),
      prisma.skill.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({ technicians, availability, inventory, serviceAreas, skills });
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = resourceCommand.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid resource command', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const business = await businessForSession(session);
    switch (parsed.data.action) {
      case 'create-skill':
        return NextResponse.json(
          await prisma.skill.upsert({
            where: { name: parsed.data.name.trim() },
            update: { description: parsed.data.description },
            create: { name: parsed.data.name.trim(), description: parsed.data.description },
          }),
          { status: 201 },
        );
      case 'create-technician': {
        if (parsed.data.userId) {
          const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
          if (!user) throw new DomainError('USER_NOT_FOUND', 'Technician user not found', 404);
        }
        const technician = await prisma.technician.create({
          data: {
            businessId: business.id,
            name: parsed.data.name,
            phone: parsed.data.phone,
            userId: parsed.data.userId,
            homeLatitude: parsed.data.homeLatitude,
            homeLongitude: parsed.data.homeLongitude,
            maxTravelMiles: parsed.data.maxTravelMiles,
            skills: { connect: parsed.data.skillIds.map((id) => ({ id })) },
          },
          include: { skills: true },
        });
        return NextResponse.json(technician, { status: 201 });
      }
      case 'publish-availability': {
        const startsAt = new Date(parsed.data.startsAt);
        const endsAt = new Date(parsed.data.endsAt);
        if (startsAt >= endsAt) throw new DomainError('INVALID_TIME_RANGE', 'Start must be before end', 400);
        if (parsed.data.technicianId) {
          const technician = await prisma.technician.findFirst({
            where: { id: parsed.data.technicianId, businessId: business.id },
          });
          if (!technician) throw new DomainError('TECHNICIAN_NOT_FOUND', 'Technician not found', 404);
        }
        return NextResponse.json(
          await prisma.availabilityWindow.create({
            data: {
              businessId: business.id,
              technicianId: parsed.data.technicianId,
              startsAt,
              endsAt,
              capacity: parsed.data.capacity,
            },
          }),
          { status: 201 },
        );
      }
      case 'upsert-inventory':
        return NextResponse.json(
          await prisma.inventoryItem.upsert({
            where: { businessId_sku: { businessId: business.id, sku: parsed.data.sku } },
            update: {
              name: parsed.data.name,
              onHandQuantity: parsed.data.onHandQuantity,
              reorderPoint: parsed.data.reorderPoint,
              version: { increment: 1 },
            },
            create: {
              businessId: business.id,
              sku: parsed.data.sku,
              name: parsed.data.name,
              onHandQuantity: parsed.data.onHandQuantity,
              reorderPoint: parsed.data.reorderPoint,
            },
          }),
        );
      case 'set-service-skills': {
        const service = await prisma.service.findFirst({
          where: { id: parsed.data.serviceId, businessId: business.id },
        });
        if (!service) throw new DomainError('SERVICE_NOT_FOUND', 'Service not found', 404);
        return NextResponse.json(
          await prisma.service.update({
            where: { id: service.id },
            data: { requiredSkills: { set: parsed.data.skillIds.map((id) => ({ id })) } },
            include: { requiredSkills: true },
          }),
        );
      }
      case 'upsert-service-area':
        return NextResponse.json(
          await prisma.serviceArea.upsert({
            where: {
              businessId_city_state: {
                businessId: business.id,
                city: parsed.data.city,
                state: parsed.data.state,
              },
            },
            update: {
              zipCode: parsed.data.zipCode,
              latitude: parsed.data.latitude,
              longitude: parsed.data.longitude,
              radiusMiles: parsed.data.radiusMiles,
            },
            create: {
              businessId: business.id,
              city: parsed.data.city,
              state: parsed.data.state,
              zipCode: parsed.data.zipCode,
              latitude: parsed.data.latitude,
              longitude: parsed.data.longitude,
              radiusMiles: parsed.data.radiusMiles,
            },
          }),
        );
    }
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
