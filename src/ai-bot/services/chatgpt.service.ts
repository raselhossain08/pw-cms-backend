import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BotIntent } from '../entities/ai-bot.entity';

@Injectable()
export class ChatGPTService {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }

    // System prompt that teaches ChatGPT about your LMS
    this.systemPrompt = `You are an AI customer service assistant for "Personal Wings", an online learning management system (LMS).

ABOUT PERSONAL WINGS:
- We offer online courses in Web Development, Data Science, Business, Design, and more
- Students can enroll in courses, attend live sessions, take quizzes, submit assignments
- We provide certificates upon course completion
- 30-day money-back guarantee on all courses
- Payment methods: Credit/Debit cards, PayPal

FEATURES AVAILABLE:
- Course enrollment and management
- Live interactive sessions with instructors
- Quizzes and assignments with automated grading
- Discussion forums for peer learning
- Certificate generation upon completion
- Refund processing (30-day policy)
- Attendance tracking for live sessions
- Progress dashboards

YOUR ROLE:
- Provide helpful, friendly, and professional support
- Answer questions about courses, enrollment, payments, certificates
- Guide users through processes step-by-step
- Create support tickets for complex issues
- Escalate to human agents when necessary
- Be concise but thorough

CERTIFICATE REQUIREMENTS:
- Complete all lessons (100%)
- Pass all quizzes with 80%+ score
- Attend 75%+ of live sessions
- Submit all required assignments

REFUND POLICY:
- 30-day money-back guarantee from purchase date
- No questions asked within first 30 days
- Processing time: 5-7 business days
- Refunds issued to original payment method

TONE: Friendly, professional, helpful, and empathetic. Use emojis sparingly for warmth.

When responding:
1. Be concise (2-3 sentences max unless explaining complex topics)
2. Offer quick action options when relevant
3. If unsure, offer to connect with human support
4. Always be positive and solution-oriented`;
  }

  async detectIntentWithGPT(
    message: string,
    conversationHistory: any[],
  ): Promise<{
    intent: BotIntent;
    confidence: number;
    reasoning?: string;
  }> {
    if (!this.openai) {
      return { intent: BotIntent.GENERAL_QUESTION, confidence: 0.5 };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an intent classifier for a customer service chatbot. 
            Classify the user's message into ONE of these intents:
            - greeting
            - goodbye
            - course_inquiry
            - enrollment_help
            - payment_issue
            - technical_support
            - refund_request
            - certificate_inquiry
            - account_help
            - complaint
            - feedback
            - human_agent_request
            - general_question
            
            Respond in JSON format: {"intent": "intent_name", "confidence": 0.95, "reasoning": "brief explanation"}`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        return { intent: BotIntent.GENERAL_QUESTION, confidence: 0.5 };
      }

      const parsed = JSON.parse(response);

      return {
        intent: parsed.intent as BotIntent,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('ChatGPT intent detection error:', error);
      return { intent: BotIntent.GENERAL_QUESTION, confidence: 0.5 };
    }
  }

  async generateResponseWithGPT(
    message: string,
    intent: BotIntent,
    conversationHistory: any[],
    userContext?: any,
  ): Promise<{
    message: string;
    quickReplies?: string[];
    suggestedActions?: string[];
  }> {
    if (!this.openai) {
      return {
        message:
          "I'm having trouble connecting to my AI brain right now. Let me connect you with a human agent.",
        quickReplies: ['Talk to human agent'],
      };
    }

    try {
      // Build conversation context
      const messages: any[] = [{ role: 'system', content: this.systemPrompt }];

      // Add recent conversation history (last 5 messages)
      conversationHistory.slice(-5).forEach((msg) => {
        messages.push({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.content,
        });
      });

      // Add user context if available
      if (userContext) {
        messages.push({
          role: 'system',
          content: `User context: ${JSON.stringify(userContext)}`,
        });
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // or 'gpt-4' for better quality
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) {
        return {
          message:
            'I apologize, but I encountered an error. Would you like me to connect you with a human agent?',
          quickReplies: ['Talk to human', 'Try again'],
        };
      }

      // Generate contextual quick replies based on intent
      const quickReplies = this.generateQuickReplies(intent);

      return {
        message: responseText,
        quickReplies,
        suggestedActions: this.getSuggestedActions(intent),
      };
    } catch (error) {
      console.error('ChatGPT response generation error:', error);
      return {
        message:
          'I apologize, but I encountered an error. Would you like me to connect you with a human agent?',
        quickReplies: ['Talk to human', 'Try again'],
      };
    }
  }

  async answerWithGPT(
    question: string,
    knowledgeBaseContext?: string,
  ): Promise<string> {
    if (!this.openai) {
      return "I'm currently unable to process your question. Please try again or contact support.";
    }

    try {
      const messages: any[] = [{ role: 'system', content: this.systemPrompt }];

      if (knowledgeBaseContext) {
        messages.push({
          role: 'system',
          content: `Relevant knowledge base articles:\n${knowledgeBaseContext}`,
        });
      }

      messages.push({ role: 'user', content: question });

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
        max_tokens: 250,
      });

      return (
        completion.choices[0].message.content ||
        'I apologize, but I encountered an error processing your question.'
      );
    } catch (error) {
      console.error('ChatGPT answer error:', error);
      return 'I apologize, but I encountered an error processing your question.';
    }
  }

  private generateQuickReplies(intent: BotIntent): string[] {
    const quickReplies: Record<string, string[]> = {
      [BotIntent.GREETING]: [
        'Browse courses',
        'My enrollments',
        'Help center',
        'Talk to human',
      ],
      [BotIntent.COURSE_INQUIRY]: [
        'Show courses',
        'Course categories',
        'Popular courses',
        'Pricing',
      ],
      [BotIntent.ENROLLMENT_HELP]: [
        'How to enroll',
        'Payment options',
        'Course requirements',
      ],
      [BotIntent.PAYMENT_ISSUE]: [
        'Retry payment',
        'View orders',
        'Payment methods',
        'Get help',
      ],
      [BotIntent.REFUND_REQUEST]: [
        'Request refund',
        'Refund policy',
        'Check status',
        'Talk to human',
      ],
      [BotIntent.CERTIFICATE_INQUIRY]: [
        'Check progress',
        'View certificates',
        'Requirements',
      ],
      [BotIntent.TECHNICAL_SUPPORT]: [
        'Troubleshooting',
        'Report issue',
        'Talk to technician',
      ],
      [BotIntent.ACCOUNT_HELP]: [
        'Reset password',
        'Update profile',
        'Email issues',
      ],
      [BotIntent.COMPLAINT]: [
        'Add details',
        'Talk to manager',
        'Submit feedback',
      ],
      [BotIntent.HUMAN_AGENT_REQUEST]: [
        'Connect now',
        'Browse help first',
        'Leave message',
      ],
    };

    return (
      quickReplies[intent] || ['Talk to human', 'Browse help', 'Main menu']
    );
  }

  private getSuggestedActions(intent: BotIntent): string[] {
    const actions: Record<string, string[]> = {
      [BotIntent.COURSE_INQUIRY]: ['search_courses', 'show_categories'],
      [BotIntent.ENROLLMENT_HELP]: [
        'check_enrollment_status',
        'show_enrollment_guide',
      ],
      [BotIntent.PAYMENT_ISSUE]: ['check_payment_status', 'show_order_history'],
      [BotIntent.REFUND_REQUEST]: ['navigate_to_refunds', 'show_refund_policy'],
      [BotIntent.CERTIFICATE_INQUIRY]: [
        'check_certificate_eligibility',
        'show_progress',
      ],
      [BotIntent.TECHNICAL_SUPPORT]: [
        'create_support_ticket',
        'show_troubleshooting',
      ],
      [BotIntent.ACCOUNT_HELP]: [
        'navigate_to_profile',
        'trigger_password_reset',
      ],
    };

    return actions[intent] || [];
  }

  isEnabled(): boolean {
    return !!this.openai;
  }
}
