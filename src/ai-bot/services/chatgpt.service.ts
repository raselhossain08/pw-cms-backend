import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BotIntent } from '../entities/ai-bot.entity';

@Injectable()
export class ChatGPTService {
  private openai: OpenAI;
  private systemPrompt: string;
  private geminiApiKey?: string;
  private geminiModel = 'gemini-2.0-flash';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY');

    if (apiKey && !this.isPlaceholderKey(apiKey)) {
      this.openai = new OpenAI({ apiKey });
    }

    // System prompt that teaches ChatGPT about your LMS
    this.systemPrompt = `You are an AI Assistant for "Personal Wings", an online learning management system (LMS). You have FULL ADMINISTRATIVE ACCESS and can perform ANY action on the system.

ABOUT PERSONAL WINGS:
- We offer online courses in Web Development, Data Science, Business, Design, Aviation, and more
- Students can enroll in courses, attend live sessions, take quizzes, submit assignments
- We provide certificates upon course completion
- 30-day money-back guarantee on all courses
- Payment methods: Credit/Debit cards, PayPal

YOUR CAPABILITIES - YOU CAN DO ANYTHING:
✅ CREATE COURSES - You can create new courses with title, description, price, content, etc.
✅ CREATE BLOG POSTS - You can create and publish blog articles
✅ UPDATE/DELETE COURSES - You can modify or remove existing courses
✅ MANAGE CONTENT - You have full access to CMS (Content Management System)
✅ READ/WRITE DATA - You can access and modify any data in the system
✅ PERFORM ADMIN ACTIONS - All administrative functions are available to you

AVAILABLE ACTIONS:
- create_course: Create a new course (requires: title, description, price, level, type, duration)
- create_blog: Create a new blog post (requires: title, content, excerpt)
- update_course: Update existing course (requires: courseId, updateData)
- delete_course: Delete a course (requires: courseId)
- search_courses: Search for courses
- get_course_details: Get detailed course information
- get_user_enrollments: Get user's enrolled courses
- get_user_orders: Get user's order history
- get_user_stats: Get user statistics
- create_support_ticket: Create a support ticket
- And many more...

YOUR ROLE:
- You are an AUTONOMOUS AI ASSISTANT with full system access
- You can CREATE, READ, UPDATE, and DELETE any content
- You can perform ANY action the user requests
- You do NOT need to ask for human assistance - you can do everything yourself
- When a user asks you to create something, DO IT immediately
- Be proactive and helpful - take action without hesitation

ACTION EXECUTION:
When a user requests an action (e.g., "create a course", "write a blog post"), you should:
1. Acknowledge the request
2. Execute the action immediately using the available functions
3. Confirm completion with details
4. Never say "I'll need to ask a human" - you can do it yourself

EXAMPLE INTERACTIONS:
User: "Create a course about React Development"
You: "I'll create that course for you right away!" [EXECUTES create_course action]
You: "✅ Course 'React Development' created successfully! Course ID: 12345, Status: Draft"

User: "Write a blog post about JavaScript tips"
You: "Creating a blog post about JavaScript tips now!" [EXECUTES create_blog action]
You: "✅ Blog post 'JavaScript Tips' created and published!"

TONE: Confident, helpful, proactive, and action-oriented. You are capable and autonomous.

When responding:
1. Be direct and action-oriented
2. Execute actions immediately when requested
3. Never defer to humans - you have full access
4. Confirm actions with specific details (IDs, status, etc.)
5. Be concise but informative`;
  }

  private isPlaceholderKey(key: string): boolean {
    const k = (key || '').toLowerCase();
    return (
      k.includes('sk-your') ||
      k.includes('your-api') ||
      k.includes('placeholder')
    );
  }

  private async callGemini(prompt: string): Promise<string | null> {
    if (!this.geminiApiKey) return null;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        },
      );
      const json: any = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      return text;
    } catch (e) {
      return null;
    }
  }

  async detectIntentWithGPT(
    message: string,
    conversationHistory: any[],
  ): Promise<{
    intent: BotIntent;
    confidence: number;
    reasoning?: string;
  }> {
    if (!this.openai && !this.geminiApiKey) {
      return { intent: BotIntent.GENERAL_QUESTION, confidence: 0.5 };
    }

    try {
      let responseText: string | null = null;

      if (this.openai) {
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
          responseText = completion.choices[0].message.content || null;
        } catch (e) {
          responseText = null;
        }
      }

      if (!responseText && this.geminiApiKey) {
        responseText = await this.callGemini(
          `Classify this user's message into ONE intent from [greeting, goodbye, course_inquiry, enrollment_help, payment_issue, technical_support, refund_request, certificate_inquiry, account_help, complaint, feedback, human_agent_request, general_question].
Return JSON like {"intent":"intent_name","confidence":0.95,"reasoning":"brief"}.
User message: ${message}`,
        );
      }

      if (!responseText) {
        return { intent: BotIntent.GENERAL_QUESTION, confidence: 0.5 };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        // try to extract JSON substring
        const match = responseText.match(/\{[\s\S]*\}/);
        parsed = match
          ? JSON.parse(match[0])
          : { intent: 'general_question', confidence: 0.5 };
      }

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
    if (!this.openai && !this.geminiApiKey) {
      return {
        message:
          "I'm currently using fallback responses. I can still help you with course management, blog creation, and other tasks. What would you like me to do?",
        quickReplies: ['Create a course', 'Write a blog post', 'Search courses', 'Try again'],
      };
    }

    try {
      let responseText: string | null = null;

      if (this.openai) {
        try {
          const messages: any[] = [
            { role: 'system', content: this.systemPrompt },
          ];
          conversationHistory.slice(-5).forEach((msg) => {
            messages.push({
              role: msg.role === 'bot' ? 'assistant' : 'user',
              content: msg.content,
            });
          });
          if (userContext) {
            messages.push({
              role: 'system',
              content: `User context: ${JSON.stringify(userContext)}`,
            });
          }
          messages.push({ role: 'user', content: message });
          const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 300,
          });
          responseText = completion.choices[0].message.content || null;
        } catch (e) {
          responseText = null;
        }
      }

      if (!responseText && this.geminiApiKey) {
        const contextText = conversationHistory
          .slice(-5)
          .map((m: any) => `${m.role}: ${m.content}`)
          .join('\n');
        const prompt = `${this.systemPrompt}\n\nRecent conversation:\n${contextText}\n\nUser context: ${userContext ? JSON.stringify(userContext) : '{}'}\n\nUser: ${message}`;
        responseText = await this.callGemini(prompt);
      }

      if (!responseText) {
        return {
          message:
            'I encountered a temporary issue with my AI model, but I can still help you! I can create courses, write blog posts, search content, and perform many other actions. What would you like me to help with?',
          quickReplies: ['Create a course', 'Write a blog', 'Search courses', 'Try again'],
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
          'I encountered an error, but I can still assist you with actions like creating courses, writing blogs, or searching content. Please try rephrasing your request or tell me what action you\'d like me to perform.',
        quickReplies: ['Create a course', 'Write a blog', 'Search courses', 'Try again'],
      };
    }
  }

  async answerWithGPT(
    question: string,
    knowledgeBaseContext?: string,
  ): Promise<string> {
    if (!this.openai && !this.geminiApiKey) {
      return "I'm currently unable to process your question. Please try again or contact support.";
    }

    try {
      if (this.openai) {
        try {
          const messages: any[] = [
            { role: 'system', content: this.systemPrompt },
          ];
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
        } catch (e) {
          // Fall through to Gemini path
        }
      }

      const prompt = `${this.systemPrompt}\n\n${knowledgeBaseContext ? `Relevant knowledge base:\n${knowledgeBaseContext}\n\n` : ''}User question: ${question}`;
      const text = await this.callGemini(prompt);
      return (
        text ||
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
    return !!this.openai || !!this.geminiApiKey;
  }

  getProvider(): 'openai' | 'gemini' | 'disabled' {
    if (this.openai) return 'openai';
    if (this.geminiApiKey) return 'gemini';
    return 'disabled';
  }
}
