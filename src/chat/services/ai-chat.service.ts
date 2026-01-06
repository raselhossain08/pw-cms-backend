import { Injectable, Logger } from '@nestjs/common';
import { ChatGPTService } from '../../ai-bot/services/chatgpt.service';
import { ConfigService } from '@nestjs/config';

interface AIResponse {
  content: string;
  confidence: number;
  isAI: boolean;
  quickReplies?: string[];
  suggestedActions?: string[];
}

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly chatGPTService: ChatGPTService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('AI_CHAT_ENABLED', true);
  }

  async generateAIResponse(
    userMessage: string,
    conversationHistory: any[],
    aiConfig?: {
      provider?: 'chatgpt' | 'gemini' | 'custom';
      responseDelay?: number;
      tone?: 'professional' | 'friendly' | 'casual' | 'formal';
      confidenceThreshold?: number;
    },
  ): Promise<AIResponse | null> {
    this.logger.log(
      `[AI-Chat] Starting generateAIResponse - enabled: ${this.enabled}`,
    );
    this.logger.log(`[AI-Chat] User message: ${userMessage}`);
    this.logger.log(`[AI-Chat] AI Config: ${JSON.stringify(aiConfig)}`);

    if (!this.enabled) {
      this.logger.debug('AI chat is disabled');
      return null;
    }

    try {
      this.logger.log('[AI-Chat] Detecting intent...');
      // Detect intent first with timeout
      const intentResult = await Promise.race([
        this.chatGPTService.detectIntentWithGPT(
          userMessage,
          conversationHistory,
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Intent detection timeout')),
            10000,
          ),
        ),
      ]);

      this.logger.log(
        `[AI-Chat] Detected intent: ${intentResult.intent} with confidence: ${intentResult.confidence}`,
      );

      // Check confidence threshold
      // Default to 0.4 to allow fallback responses (confidence 0.5) when no API keys are configured
      const confidenceThreshold = aiConfig?.confidenceThreshold ?? 0.4;
      this.logger.log(
        `[AI-Chat] Confidence threshold: ${confidenceThreshold}, actual: ${intentResult.confidence}`,
      );

      if (intentResult.confidence < confidenceThreshold) {
        this.logger.log('[AI-Chat] Confidence below threshold, not responding');
        return null;
      }

      // Generate response based on intent with timeout
      const response = await Promise.race([
        this.chatGPTService.generateResponseWithGPT(
          userMessage,
          intentResult.intent,
          conversationHistory,
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Response generation timeout')),
            15000,
          ),
        ),
      ]);

      // Apply tone if specified
      let finalContent = response.message;
      if (aiConfig?.tone) {
        finalContent = this.applyTone(finalContent, aiConfig.tone);
      }

      // Apply response delay if specified
      if (aiConfig?.responseDelay && aiConfig.responseDelay > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, aiConfig.responseDelay),
        );
      }

      return {
        content: finalContent,
        confidence: intentResult.confidence,
        isAI: true,
        quickReplies: response.quickReplies,
        suggestedActions: response.suggestedActions,
      };
    } catch (error) {
      this.logger.error('[AI-Chat] AI response generation failed:', error);
      this.logger.error('[AI-Chat] Error message:', error.message);
      this.logger.error('[AI-Chat] Error stack:', error.stack);

      // Enhanced fallback responses based on error type
      let fallbackContent =
        "I apologize, but I'm having trouble processing your request right now. ";
      let fallbackConfidence = 0.3;

      if (error.message.includes('timeout')) {
        fallbackContent +=
          'The system is taking longer than expected to respond. ';
        fallbackConfidence = 0.2;
      } else if (
        error.message.includes('API') ||
        error.message.includes('service')
      ) {
        fallbackContent += 'Our AI service is temporarily unavailable. ';
        fallbackConfidence = 0.1;
      }

      fallbackContent +=
        'Please try again or contact our support team for assistance.';

      return {
        content: fallbackContent,
        confidence: fallbackConfidence,
        isAI: true,
        quickReplies: ['Try again', 'Contact support', 'Browse courses'],
      };
    }
  }

  private applyTone(content: string, tone: string): string {
    switch (tone) {
      case 'professional':
        return content
          .replace(/I('m| am)/g, 'We are')
          .replace(/my/g, 'our')
          .replace(/I/g, 'we')
          .replace(/\./g, '.')
          .replace(/!/g, '.');

      case 'friendly':
        return (
          content
            .replace(/We are/g, "I'm")
            .replace(/our/g, 'my')
            .replace(/we/g, 'I') + ' 😊'
        );

      case 'casual':
        return content
          .replace(/We are/g, "I'm")
          .replace(/our/g, 'my')
          .replace(/we/g, 'I')
          .replace(/\./g, '!');

      case 'formal':
        return content
          .replace(/I('m| am)/g, 'This system is')
          .replace(/my/g, 'the')
          .replace(/I/g, 'the system')
          .replace(/!/g, '.');

      default:
        return content;
    }
  }

  async shouldAIRespond(
    supportStatus: 'online' | 'offline' | 'busy',
    autoRespondWhen: 'always' | 'offline' | 'busy' | 'afterHours',
  ): Promise<boolean> {
    if (!this.enabled) return false;

    switch (autoRespondWhen) {
      case 'always':
        return true;

      case 'offline':
        return supportStatus === 'offline';

      case 'busy':
        return supportStatus === 'busy' || supportStatus === 'offline';

      case 'afterHours': {
        const now = new Date();
        const hour = now.getHours();
        const isAfterHours = hour < 9 || hour >= 17;
        return isAfterHours || supportStatus === 'offline';
      }

      default:
        return false;
    }
  }

  getStatus(): {
    enabled: boolean;
    providers: {
      chatgpt: boolean;
      gemini: boolean;
    };
  } {
    const chatgptApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY');

    return {
      enabled: this.enabled,
      providers: {
        chatgpt: !!chatgptApiKey && !this.isPlaceholderKey(chatgptApiKey),
        gemini: !!geminiApiKey && !this.isPlaceholderKey(geminiApiKey),
      },
    };
  }

  private isPlaceholderKey(key: string): boolean {
    const k = (key || '').toLowerCase();
    return (
      k.includes('sk-your') ||
      k.includes('your-api') ||
      k.includes('placeholder')
    );
  }
}
