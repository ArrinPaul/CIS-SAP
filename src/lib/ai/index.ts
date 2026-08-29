import { genkit } from 'genkit';
import { googleAI, textEmbedding004 } from '@genkit-ai/googleai';
import { z } from 'zod';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-1.5-flash',
});

const AI_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number = AI_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

function getAiFailureReason(error: unknown): 'timeout' | 'quota' | 'missing_key' | 'unknown' {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('api key') || message.includes('failed_precondition') || message.includes('gemini_api_key')) {
    return 'missing_key';
  }
  if (message.includes('ai_timeout') || message.includes('timeout')) return 'timeout';
  if (
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('resource_exhausted') ||
    message.includes('429')
  ) {
    return 'quota';
  }
  return 'unknown';
}

function logAiFailure(flowName: string, error: unknown) {
  const reason = getAiFailureReason(error);
  if (reason === 'missing_key') {
    console.warn(`[AI:${flowName}] skipped/degraded: GEMINI_API_KEY or GOOGLE_API_KEY is not set in environment.`);
    return;
  }
  console.warn(`[AI:${flowName}] degraded due to ${reason}`, error);
}

async function safeGenerate<T>(flowName: string, input: Parameters<typeof ai.generate>[0]) {
  if (!isAiConfigured()) {
    return null;
  }
  try {
    const result = await withTimeout(ai.generate(input));
    return result;
  } catch (error) {
    logAiFailure(flowName, error);
    return null;
  }
}

async function safeEmbed(input: Parameters<typeof ai.embed>[0]) {
  if (!isAiConfigured()) {
    return null;
  }
  try {
    return await withTimeout(ai.embed(input));
  } catch (error) {
    logAiFailure('embed', error);
    return null;
  }
}

/**
 * Generate embeddings for a given text
 */
export async function generateEmbedding(text: string) {
  const result = await safeEmbed({
    embedder: textEmbedding004,
    content: text,
  });
  return result;
}

/**
 * Flow for the Event Chatbot
 */
export const aiChatbotFlow = ai.defineFlow(
  {
    name: 'aiChatbotFlow',
    inputSchema: z.object({
      question: z.string(),
      eventContext: z.string(),
      messages: z.array(z.any()).optional(),
    }),
    outputSchema: z.object({
      answer: z.string(),
    }),
  },
  async (input) => {
    const prompt = `
      You are a helpful event assistant for an event platform called Eventra.
      Use the following context about the event to answer the user's question.
      If the information is not in the context, be polite and say you don't have that specific detail yet.
      
      CONTEXT:
      ${input.eventContext}
      
      USER QUESTION:
      ${input.question}
    `;

    const result = await safeGenerate('aiChatbotFlow', {
      prompt,
      messages: input.messages,
    });

    return { answer: result?.text || "I'm sorry, I couldn't generate an answer right now." };
  }
);

/**
 * Flow for Event Summarization
 */
export const eventSummarizerFlow = ai.defineFlow(
  {
    name: 'eventSummarizerFlow',
    inputSchema: z.object({
      eventTitle: z.string(),
      eventDescription: z.string(),
      attendeeCount: z.number(),
      feedback: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      summary: z.string(),
    }),
  },
  async (input) => {
    const prompt = `
      Generate a professional and engaging post-event summary for the event "${input.eventTitle}".
      
      Details:
      - Description: ${input.eventDescription}
      - Total Attendees: ${input.attendeeCount}
      
      ${input.feedback && input.feedback.length > 0 ? `Attendee Feedback: \n- ${input.feedback.join('\n- ')}` : ''}
      
      The summary should include:
      1. A high-level overview of the event's success.
      2. Key highlights and takeaways.
      3. A thank you note to attendees.
    `;

    const result = await safeGenerate('eventSummarizerFlow', { prompt });
    return { summary: result?.text || "Summary generation failed due to temporary AI limits." };
  }
);

/**
 * Flow for Personalized Recommendations
 */
export const recommendationFlow = ai.defineFlow(
  {
    name: 'recommendationFlow',
    inputSchema: z.object({
      userInterests: z.array(z.string()),
      userRole: z.string(),
      availableEvents: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        category: z.string(),
      })),
    }),
    outputSchema: z.object({
      recommendations: z.array(z.object({
        eventId: z.string(),
        relevanceScore: z.number(),
        reason: z.string(),
      })),
    }),
  },
  async (input) => {
    const prompt = `
      You are an expert event matcher. Given a user's interests and a list of available events, select the top 3 most relevant events.
      
      User Interests: ${input.userInterests.join(', ')}
      User Role: ${input.userRole}
      
      Available Events:
      ${JSON.stringify(input.availableEvents)}
      
      Return your response as a JSON array of objects with eventId, relevanceScore (0-100), and reason.
    `;

    const result = await safeGenerate('recommendationFlow', {
      prompt,
      output: { format: 'json', schema: z.array(z.object({
        eventId: z.string(),
        relevanceScore: z.number(),
        reason: z.string(),
      })) },
    });

    const recommendations = result?.output || [];
    return { recommendations: recommendations.slice(0, 3) };
  }
);

/**
 * Flow for AI Event Planning (Description & Agenda)
 */
export const eventPlannerFlow = ai.defineFlow(
  {
    name: 'eventPlannerFlow',
    inputSchema: z.object({
      title: z.string(),
      category: z.string(),
      description: z.string().optional(),
    }),
    outputSchema: z.object({
      suggestedDescription: z.string(),
      suggestedAgenda: z.array(z.object({
        time: z.string(),
        title: z.string(),
        description: z.string(),
      })),
    }),
  },
  async (input) => {
    const prompt = `
      You are an expert event planner. Generate a detailed description and a 3-item sample agenda for an event.
      
      Title: ${input.title}
      Category: ${input.category}
      Current Info: ${input.description || 'None'}
      
      Return as JSON with suggestedDescription and suggestedAgenda array.
    `;

    const result = await safeGenerate('eventPlannerFlow', {
      prompt,
      output: { 
        format: 'json', 
        schema: z.object({
          suggestedDescription: z.string(),
          suggestedAgenda: z.array(z.object({
            time: z.string(),
            title: z.string(),
            description: z.string(),
          })),
        }) 
      },
    });

    return result?.output || { suggestedDescription: "", suggestedAgenda: [] };
  }
);

/**
 * Flow for Social Media Post Generation
 */
export const socialMediaPostFlow = ai.defineFlow(
  {
    name: 'socialMediaPostFlow',
    inputSchema: z.object({
      eventTitle: z.string(),
      platform: z.enum(['twitter', 'linkedin', 'instagram']),
    }),
    outputSchema: z.object({
      post: z.string(),
    }),
  },
  async (input) => {
    const prompt = `Create a viral ${input.platform} post for the event "${input.eventTitle}". Include hashtags.`;
    const result = await safeGenerate('socialMediaPostFlow', { prompt });
    return { post: result?.text || "" };
  }
);

/**
 * Flow for AI Content Moderation
 */
export const aiModerationFlow = ai.defineFlow(
  {
    name: 'aiModerationFlow',
    inputSchema: z.object({
      content: z.string(),
    }),
    outputSchema: z.object({
      isFlagged: z.boolean(),
      reason: z.string().optional(),
    }),
  },
  async (input) => {
    const prompt = `
      Analyze this content for community guideline violations (hate speech, spam, harassment).
      Content: "${input.content}"
      Return JSON with isFlagged (boolean) and reason.
    `;
    const result = await safeGenerate('aiModerationFlow', {
      prompt,
      output: { format: 'json' },
    });
    return (result?.output as any) || { isFlagged: false };
  }
);

/**
 * Flow for Networking Matchmaking
 */
export const matchmakingFlow = ai.defineFlow(
  {
    name: 'matchmakingFlow',
    inputSchema: z.object({
      userProfile: z.any(),
      potentialMatches: z.array(z.any()),
    }),
    outputSchema: z.object({
      matches: z.array(z.object({
        userId: z.string(),
        matchScore: z.number(),
        reason: z.string(),
      })),
    }),
  },
  async (input) => {
    const prompt = `
      Match this user with the best potential connections based on shared interests and roles.
      User: ${JSON.stringify(input.userProfile)}
      Matches: ${JSON.stringify(input.potentialMatches)}
      Return top 3 as JSON array of objects with userId, matchScore, and reason.
    `;
    const result = await safeGenerate('matchmakingFlow', {
      prompt,
      output: { format: 'json' },
    });
    
    try {
      const parsed = result?.output as any;
      if (!parsed) return { matches: [] };
      const matches = Array.isArray(parsed) ? parsed : (parsed.matches || []);
      return { matches: matches.slice(0, 3) };
    } catch (e) {
      return { matches: [] };
    }
  }
);

/**
 * Flow for Smart Scheduling
 */
export const smartSchedulerFlow = ai.defineFlow(
  {
    name: 'smartSchedulerFlow',
    inputSchema: z.object({
      eventTitle: z.string(),
      category: z.string(),
      targetAudience: z.string().optional(),
    }),
    outputSchema: z.object({
      bestDays: z.array(z.string()),
      bestTimeSlots: z.array(z.string()),
      reasoning: z.string(),
    }),
  },
  async (input) => {
    const prompt = `Suggest best days and times for: ${input.eventTitle}. Category: ${input.category}. Return JSON.`;
    const result = await safeGenerate('smartSchedulerFlow', { prompt, output: { format: 'json' } });
    return (result?.output as any) || { bestDays: [], bestTimeSlots: [], reasoning: "" };
  }
);

/**
 * Flow for Predictive Attendance Estimation
 */
export const predictiveAttendanceFlow = ai.defineFlow(
  {
    name: 'predictiveAttendanceFlow',
    inputSchema: z.object({
      eventDetails: z.any(),
      registrationTrend: z.array(z.number()),
    }),
    outputSchema: z.object({
      predictedTotal: z.number(),
      confidenceScore: z.number(),
      factors: z.array(z.string()),
    }),
  },
  async (input) => {
    const prompt = `Predict final attendance based on trend: ${input.registrationTrend.join(',')}. Return JSON.`;
    const result = await safeGenerate('predictiveAttendanceFlow', { prompt, output: { format: 'json' } });
    return (result?.output as any) || { predictedTotal: 0, confidenceScore: 0, factors: [] };
  }
);

/**
 * Flow for AI Sentiment Analysis (Event Feedback)
 */
export const aiSentimentAnalysisFlow = ai.defineFlow(
  {
    name: 'aiSentimentAnalysisFlow',
    inputSchema: z.object({
      feedback: z.array(z.string()),
    }),
    outputSchema: z.object({
      overallSentiment: z.enum(['positive', 'neutral', 'negative']),
      keyThemes: z.array(z.string()),
      averageRating: z.number(),
    }),
  },
  async (input) => {
    const prompt = `
      Analyze the following attendee feedback comments.
      Feedback: ${input.feedback.join('\n- ')}
      
      Return JSON with overallSentiment, keyThemes (3-5 items), and averageRating (1-5 scale).
    `;
    const result = await safeGenerate('aiSentimentAnalysisFlow', {
      prompt,
      output: { format: 'json' },
    });
    return (result?.output as any) || { overallSentiment: 'neutral', keyThemes: [], averageRating: 3 };
  }
);

/**
 * Flow for Certificate Personalized Messages
 */
export const certificatePersonalizedMessageFlow = ai.defineFlow(
  {
    name: 'certificatePersonalizedMessageFlow',
    inputSchema: z.object({
      userName: z.string(),
      eventTitle: z.string(),
      performanceMetrics: z.any().optional(),
    }),
    outputSchema: z.object({
      personalizedMessage: z.string(),
    }),
  },
  async (input) => {
    const prompt = `
      Create a unique, congratulatory message for a certificate of completion.
      Attendee: ${input.userName}
      Event: ${input.eventTitle}
      
      Make it professional yet inspiring. Max 2 sentences.
    `;
    const result = await safeGenerate('certificatePersonalizedMessageFlow', { prompt });
    return { personalizedMessage: result?.text || "Congratulations on completing the event!" };
  }
);

/**
 * Flow for Organizer Task Generation
 */
export const organizerTaskListFlow = ai.defineFlow(
  {
    name: 'organizerTaskListFlow',
    inputSchema: z.object({
      eventTitle: z.string(),
      eventDescription: z.string(),
      eventType: z.string(),
      startDate: z.string(),
    }),
    outputSchema: z.object({
      tasks: z.array(z.string()),
    }),
  },
  async (input) => {
    const prompt = `
      You are an expert event planner. Generate a comprehensive "To-Do" list for the organizer of this event.
      
      Details:
      - Title: ${input.eventTitle}
      - Description: ${input.eventDescription}
      - Type: ${input.eventType}
      - Date: ${input.startDate}
      
      Provide a list of clear, actionable tasks. Focus on logistics, marketing, and attendee engagement.
    `;

    const result = await safeGenerate('organizerTaskListFlow', {
      prompt,
      output: { format: 'json' },
    });

    try {
      const parsed = result?.output as any;
      return { tasks: Array.isArray(parsed) ? parsed : (parsed.tasks || []) };
    } catch (e) {
      return { tasks: [] };
    }
  }
);

/**
 * Flow for Personalized Event Reminders
 */
export const personalizedEventReminderFlow = ai.defineFlow(
  {
    name: 'personalizedEventReminderFlow',
    inputSchema: z.object({
      userName: z.string(),
      eventTitle: z.string(),
      startTime: z.string(),
      interests: z.array(z.string()),
    }),
    outputSchema: z.object({
      reminderText: z.string(),
      subjectLine: z.string(),
    }),
  },
  async (input) => {
    const prompt = `Create personalized reminder for ${input.userName} about ${input.eventTitle}. Return JSON.`;
    const result = await safeGenerate('personalizedEventReminderFlow', { prompt, output: { format: 'json' } });
    return (result?.output as any) || { reminderText: "", subjectLine: "" };
  }
);

/**
 * Flow for Engagement Picks (Hyper-personalized)
 */
export const engagementPicksFlow = ai.defineFlow(
  {
    name: 'engagementPicksFlow',
    inputSchema: z.object({
      userActivity: z.any(),
      upcomingItems: z.array(z.any()),
    }),
    outputSchema: z.object({
      topPickId: z.string(),
      rationale: z.string(),
    }),
  },
  async (input) => {
    const prompt = `Pick best next item for user based on activity. Return JSON.`;
    const result = await safeGenerate('engagementPicksFlow', { prompt, output: { format: 'json' } });
    return (result?.output as any) || { topPickId: "", rationale: "" };
  }
);

/**
 * Flow for Content Recommendations
 */
export const contentRecommendationFlow = ai.defineFlow(
  {
    name: 'contentRecommendationFlow',
    inputSchema: z.object({
      userInterests: z.array(z.string()),
      availableContent: z.array(z.any()),
    }),
    outputSchema: z.object({
      recommendedContent: z.array(z.object({
        contentId: z.string(),
        relevanceScore: z.number(),
        reason: z.string(),
      })),
    }),
  },
  async (input) => {
    const prompt = `Recommend content based on interests. Return JSON array.`;
    const result = await safeGenerate('contentRecommendationFlow', {
      prompt,
      output: { format: 'json' },
    });
    
    try {
      const parsed = result?.output as any;
      if (!parsed) return { recommendedContent: [] };
      const recommendations = Array.isArray(parsed) ? parsed : (parsed.recommendedContent || []);
      return { recommendedContent: recommendations.slice(0, 3) };
    } catch (e) {
      return { recommendedContent: [] };
    }
  }
);

/**
 * Flow for Connection Recommendations (Deep Match)
 */
export const connectionRecommendationFlow = ai.defineFlow(
  {
    name: 'connectionRecommendationFlow',
    inputSchema: z.object({
      userProfile: z.any(),
      network: z.array(z.any()),
    }),
    outputSchema: z.object({
      connections: z.array(z.object({
        userId: z.string(),
        strength: z.number(),
        conversationStarter: z.string(),
      })),
    }),
  },
  async (input) => {
    const prompt = `Suggest connections based on profile. Return JSON array.`;
    const result = await safeGenerate('connectionRecommendationFlow', {
      prompt,
      output: { format: 'json' },
    });
    
    try {
      const parsed = result?.output as any;
      if (!parsed) return { connections: [] };
      const connections = Array.isArray(parsed) ? parsed : (parsed.connections || []);
      return { connections: connections.slice(0, 3) };
    } catch (e) {
      return { connections: [] };
    }
  }
);

/**
 * Flow for A/B Testing Event Descriptions
 */
export const abTestingFlow = ai.defineFlow(
  {
    name: 'abTestingFlow',
    inputSchema: z.object({
      originalDescription: z.string(),
      goal: z.string(),
    }),
    outputSchema: z.object({
      variantA: z.string(),
      variantB: z.string(),
      predictedWinner: z.string(),
    }),
  },
  async (input) => {
    const prompt = `Generate 2 high-converting description variants. Return JSON.`;
    const result = await safeGenerate('abTestingFlow', { prompt, output: { format: 'json' } });
    return (result?.output as any) || { variantA: "", variantB: "", predictedWinner: "" };
  }
);

/**
 * Flow for Structured AI Task Generation (Kanban Board)
 */
export const aiTaskGenerationFlow = ai.defineFlow(
  {
    name: 'aiTaskGenerationFlow',
    inputSchema: z.object({
      eventTitle: z.string(),
      eventDescription: z.string(),
      eventType: z.string(),
      category: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      capacity: z.number(),
      isOnline: z.boolean(),
      isPaid: z.boolean(),
    }),
    outputSchema: z.object({
      tasks: z.array(z.object({
        id: z.string(),
        content: z.string(),
        column: z.enum(['planning', 'developing', 'reviewing', 'finished']),
        priority: z.enum(['high', 'medium', 'low']),
        estimatedDuration: z.string(),
        subtasks: z.array(z.object({
          id: z.string(),
          content: z.string(),
          completed: z.boolean(),
        })),
      })),
    }),
  },
  async (input) => {
    const prompt = `
      You are an expert event planner. Generate a structured Kanban task board for this event.
      
      Event Details:
      - Title: ${input.eventTitle}
      - Description: ${input.eventDescription}
      - Type: ${input.eventType}
      - Category: ${input.category}
      - Dates: ${input.startDate} to ${input.endDate}
      - Capacity: ${input.capacity}
      - Online: ${input.isOnline}
      - Paid: ${input.isPaid}
      
      Generate 4-5 main tasks with 2-4 subtasks each.
      Distribute tasks across columns: planning, developing, reviewing, finished.
      Assign priorities: high, medium, low.
      Include estimated durations.
      
      Return as JSON with tasks array.
    `;

    const result = await safeGenerate('aiTaskGenerationFlow', {
      prompt,
      output: {
        format: 'json',
        schema: z.object({
          tasks: z.array(z.object({
            id: z.string(),
            content: z.string(),
            column: z.enum(['planning', 'developing', 'reviewing', 'finished']),
            priority: z.enum(['high', 'medium', 'low']),
            estimatedDuration: z.string(),
            subtasks: z.array(z.object({
              id: z.string(),
              content: z.string(),
              completed: z.boolean(),
            })),
          })),
        }),
      },
    });

    try {
      const parsed = result?.output as any;
      if (!parsed || !parsed.tasks) {
        return { tasks: getFallbackTasks(input.eventType) };
      }
      return { tasks: parsed.tasks };
    } catch (e) {
      return { tasks: getFallbackTasks(input.eventType) };
    }
  }
);

function getFallbackTasks(eventType: string) {
  const baseTasks = [
    {
      id: 'task-1',
      content: 'Venue Setup & Logistics',
      column: 'planning' as const,
      priority: 'high' as const,
      estimatedDuration: '2-3 days',
      subtasks: [
        { id: 'sub-1-1', content: 'Book venue and confirm dates', completed: false },
        { id: 'sub-1-2', content: 'Arrange seating and stage setup', completed: false },
        { id: 'sub-1-3', content: 'Test AV equipment', completed: false },
      ],
    },
    {
      id: 'task-2',
      content: 'Marketing & Promotion',
      column: 'planning' as const,
      priority: 'high' as const,
      estimatedDuration: '1-2 weeks',
      subtasks: [
        { id: 'sub-2-1', content: 'Create social media posts', completed: false },
        { id: 'sub-2-2', content: 'Send email invitations', completed: false },
        { id: 'sub-2-3', content: 'Set up event page', completed: false },
      ],
    },
    {
      id: 'task-3',
      content: 'Registration & Ticketing',
      column: 'developing' as const,
      priority: 'medium' as const,
      estimatedDuration: '3-5 days',
      subtasks: [
        { id: 'sub-3-1', content: 'Configure ticket tiers', completed: false },
        { id: 'sub-3-2', content: 'Test payment flow', completed: false },
      ],
    },
    {
      id: 'task-4',
      content: 'Day-of Operations',
      column: 'reviewing' as const,
      priority: 'medium' as const,
      estimatedDuration: '1 day',
      subtasks: [
        { id: 'sub-4-1', content: 'Brief volunteer team', completed: false },
        { id: 'sub-4-2', content: 'Set up check-in system', completed: false },
      ],
    },
    {
      id: 'task-5',
      content: 'Post-Event Follow-up',
      column: 'finished' as const,
      priority: 'low' as const,
      estimatedDuration: '2-3 days',
      subtasks: [
        { id: 'sub-5-1', content: 'Send thank you emails', completed: false },
        { id: 'sub-5-2', content: 'Collect feedback', completed: false },
        { id: 'sub-5-3', content: 'Generate event report', completed: false },
      ],
    },
  ];
  return baseTasks;
}

/**
 * Flow for AI Report Generation
 */
export const aiReportGenerationFlow = ai.defineFlow(
  {
    name: 'aiReportGenerationFlow',
    inputSchema: z.object({
      eventTitle: z.string(),
      eventDescription: z.string(),
      category: z.string(),
      totalAttendees: z.number(),
      capacity: z.number(),
      totalRevenue: z.number(),
      budget: z.number(),
      feedback: z.array(z.object({
        rating: z.number(),
        comment: z.string().optional(),
      })).optional(),
      keyHighlights: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      executiveSummary: z.string(),
      performanceAnalysis: z.string(),
      financialSummary: z.string(),
      feedbackAnalysis: z.string(),
      keyAchievements: z.string(),
      recommendations: z.string(),
    }),
  },
  async (input) => {
    const prompt = `
      Generate a comprehensive post-event report for "${input.eventTitle}".
      
      Event Details:
      - Category: ${input.category}
      - Description: ${input.eventDescription}
      - Total Attendees: ${input.totalAttendees} / ${input.capacity}
      - Revenue: $${input.totalRevenue}
      - Budget: $${input.budget}
      ${input.feedback ? `- Feedback: ${JSON.stringify(input.feedback)}` : ''}
      ${input.keyHighlights ? `- Key Highlights: ${input.keyHighlights.join(', ')}` : ''}
      
      Generate 6 sections:
      1. Executive Summary - Overall overview
      2. Performance Analysis - Attendance, engagement metrics
      3. Financial Summary - Revenue, budget, ROI
      4. Feedback Analysis - Attendee satisfaction
      5. Key Achievements - Major successes
      6. Recommendations - Improvement suggestions
      
      Return as JSON with all 6 sections.
    `;

    const result = await safeGenerate('aiReportGenerationFlow', {
      prompt,
      output: {
        format: 'json',
        schema: z.object({
          executiveSummary: z.string(),
          performanceAnalysis: z.string(),
          financialSummary: z.string(),
          feedbackAnalysis: z.string(),
          keyAchievements: z.string(),
          recommendations: z.string(),
        }),
      },
    });

    return (result?.output as any) || {
      executiveSummary: 'Report generation is temporarily unavailable.',
      performanceAnalysis: '',
      financialSummary: '',
      feedbackAnalysis: '',
      keyAchievements: '',
      recommendations: '',
    };
  }
);
