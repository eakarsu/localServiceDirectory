import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

async function callOpenRouter(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'LocalServices Directory',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data: OpenRouterResponse = await response.json();
  return data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    let session = sessionId
      ? await prisma.chatSession.findUnique({ where: { sessionId } })
      : null;

    const newSessionId = session?.sessionId || uuidv4();
    const messages: ChatMessage[] = (session?.messages as unknown as ChatMessage[]) || [];

    // Add user message
    messages.push({ role: 'user', content: message });

    // Search for relevant businesses based on user message
    const businessContext = await searchBusinesses(message);

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(businessContext);

    // Prepare messages for AI with system prompt
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system').slice(-10) // Keep last 10 messages for context
    ];

    // Get AI response
    const aiResponse = await callOpenRouter(aiMessages);

    // Parse AI response for structured data
    const parsedResponse = parseAIResponse(aiResponse, businessContext);

    // Add assistant response to history
    messages.push({ role: 'assistant', content: parsedResponse.message });

    // Save/update session
    await prisma.chatSession.upsert({
      where: { sessionId: newSessionId },
      update: {
        messages: messages as any,
        context: parsedResponse.context as any,
      },
      create: {
        sessionId: newSessionId,
        messages: messages as any,
        context: parsedResponse.context as any,
      },
    });

    return NextResponse.json({
      sessionId: newSessionId,
      message: parsedResponse.message,
      suggestions: parsedResponse.suggestions,
      businesses: parsedResponse.businesses,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

async function searchBusinesses(message: string) {
  const lowerMessage = message.toLowerCase();

  // Extract service keywords
  const serviceKeywords = [
    'plumber', 'plumbing', 'electrician', 'electrical', 'cleaning', 'cleaner',
    'hvac', 'heating', 'cooling', 'landscaping', 'lawn', 'roofing', 'roof',
    'painting', 'painter', 'handyman', 'repair', 'fix', 'auto', 'mechanic',
    'pet', 'grooming', 'dog', 'cat', 'beauty', 'salon', 'spa', 'massage',
    'tutor', 'tutoring', 'education', 'lawyer', 'attorney', 'accountant',
    'photographer', 'catering', 'dj', 'music', 'wedding'
  ];

  const detectedService = serviceKeywords.find(kw => lowerMessage.includes(kw));

  if (!detectedService) {
    return { businesses: [], searchQuery: null };
  }

  const businesses = await prisma.business.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: detectedService, mode: 'insensitive' } },
        { description: { contains: detectedService, mode: 'insensitive' } },
        { categories: { some: { name: { contains: detectedService, mode: 'insensitive' } } } },
        { services: { some: { name: { contains: detectedService, mode: 'insensitive' } } } },
      ],
    },
    include: {
      categories: true,
      services: { take: 5 },
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: [{ featured: 'desc' }, { avgRating: 'desc' }],
    take: 5,
  });

  return { businesses, searchQuery: detectedService };
}

function buildSystemPrompt(businessContext: { businesses: any[]; searchQuery: string | null }) {
  let prompt = `You are a helpful assistant for LocalServices, a local service directory platform.
Your role is to help users find local service providers, answer questions about services, and assist with bookings.

Guidelines:
- Be friendly, helpful, and conversational
- When recommending businesses, mention their name, rating, and key services
- If you don't find relevant businesses, offer to help the user search differently
- Suggest related services when appropriate
- Keep responses concise but informative
- Always be honest about what you know and don't know

Available actions you can suggest:
- Book an appointment
- Request a quote
- View business details
- Compare services
- Search for different services`;

  if (businessContext.businesses.length > 0) {
    prompt += `\n\nRelevant businesses found for "${businessContext.searchQuery}":\n`;
    businessContext.businesses.forEach((b, i) => {
      prompt += `\n${i + 1}. ${b.name}
   - Rating: ${b.avgRating.toFixed(1)} stars (${b.reviewCount} reviews)
   - Description: ${b.shortDescription || b.description?.substring(0, 100)}
   - Categories: ${b.categories.map((c: any) => c.name).join(', ')}
   - Services: ${b.services.map((s: any) => `${s.name}${s.price ? ` ($${s.price})` : ''}`).join(', ')}
   - Location: ${b.city}, ${b.state}
   - Verified: ${b.verified ? 'Yes' : 'No'}
   - Featured: ${b.featured ? 'Yes' : 'No'}`;
    });
  }

  return prompt;
}

function parseAIResponse(
  aiResponse: string,
  businessContext: { businesses: any[]; searchQuery: string | null }
) {
  // Generate suggestions based on context
  let suggestions: string[] = [];

  if (businessContext.businesses.length > 0) {
    const firstBusiness = businessContext.businesses[0];
    suggestions = [
      `Tell me more about ${firstBusiness?.name}`,
      'Book an appointment',
      'Get a quote',
      'Show more options',
    ];
  } else {
    suggestions = [
      'I need a plumber',
      'Find house cleaning',
      'Search for electricians',
      'Show all categories',
    ];
  }

  return {
    message: aiResponse,
    suggestions,
    businesses: businessContext.businesses.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      shortDescription: b.shortDescription,
      avgRating: b.avgRating,
      reviewCount: b.reviewCount,
      city: b.city,
      state: b.state,
      featured: b.featured,
      verified: b.verified,
      photo: b.photos[0]?.url,
      categories: b.categories.map((c: any) => c.name),
    })),
    context: {
      lastSearch: businessContext.searchQuery,
      businessIds: businessContext.businesses.map(b => b.id),
    },
  };
}
