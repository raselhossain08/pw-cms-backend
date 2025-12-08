import { ConfigService } from '@nestjs/config';
import { ChatGPTService } from './chatgpt.service';

describe('ChatGPTService Gemini fallback', () => {
  const mockConfig = {
    get: (key: string) => {
      if (key === 'GEMINI_API_KEY') return 'dummy-key';
      return undefined;
    },
  } as unknown as ConfigService;

  it('isEnabled returns true when GEMINI_API_KEY is set', () => {
    const service = new ChatGPTService(mockConfig);
    expect(service.isEnabled()).toBe(true);
  });

  it('detectIntentWithGPT uses Gemini and parses JSON', async () => {
    const service = new ChatGPTService(mockConfig) as any;
    service.openai = undefined;
    service.callGemini = async () =>
      '{"intent":"general_question","confidence":0.92,"reasoning":"simple"}';
    const result = await service.detectIntentWithGPT('How do I enroll?', []);
    expect(result.intent).toBe('general_question');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('generateResponseWithGPT returns Gemini text', async () => {
    const service = new ChatGPTService(mockConfig) as any;
    service.openai = undefined;
    service.callGemini = async () => 'This is a Gemini response.';
    const res = await service.generateResponseWithGPT(
      'Hello',
      'greeting' as any,
      [],
    );
    expect(res.message).toContain('Gemini response');
    expect(Array.isArray(res.quickReplies)).toBe(true);
  });
});
