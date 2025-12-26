import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BotConversation,
  KnowledgeBase,
  BotAnalytics,
  BotTask,
  AIAgent,
  BotIntent,
  ConversationStatus,
  ResponseType,
} from './entities/ai-bot.entity';
import { SendMessageDto, CreateKnowledgeDto } from './dto/ai-bot.dto';
import { ChatGPTService } from './services/chatgpt.service';
import { BotActionsService } from './services/bot-actions.service';
import { v4 as uuidv4 } from 'uuid';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { AiModel } from '../activity-logs/entities/ai-log.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AiBotService {
  constructor(
    @InjectModel(BotConversation.name)
    private botConversationModel: Model<BotConversation>,
    @InjectModel(KnowledgeBase.name)
    private knowledgeBaseModel: Model<KnowledgeBase>,
    @InjectModel(BotAnalytics.name)
    private botAnalyticsModel: Model<BotAnalytics>,
    @InjectModel(BotTask.name) private botTaskModel: Model<BotTask>,
    @InjectModel(AIAgent.name) private aiAgentModel: Model<AIAgent>,
    @InjectModel(User.name) private userModel: Model<User>, // Add this for user lookup
    private chatGPTService: ChatGPTService,
    private botActionsService: BotActionsService,
    private activityLogsService: ActivityLogsService, // Add this
  ) {
    this.initializeDefaultKnowledge();
  }

  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<any> {
    const { message, sessionId, context } = sendMessageDto;
    const startTime = Date.now();

    // Get or create conversation
    let conversation = sessionId
      ? await this.botConversationModel.findOne({ sessionId, userId }).exec()
      : null;

    if (!conversation) {
      conversation = new this.botConversationModel({
        userId,
        sessionId: sessionId || uuidv4(),
        status: ConversationStatus.ACTIVE,
        lastActiveAt: new Date(),
        context: context || {},
      });
    }

    // Detect intent and confidence
    const { intent, confidence } = await this.detectIntent(
      message,
      conversation,
    );

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
      intent,
      confidence,
      timestamp: new Date(),
    });

    try {
      // Generate bot response based on intent
      const botResponse = await this.generateResponse(
        intent,
        message,
        conversation,
        userId,
      );

      const duration = Date.now() - startTime;

      // Add bot response to conversation
      conversation.messages.push({
        role: 'bot',
        content: botResponse.message,
        timestamp: new Date(),
      });

      conversation.lastActiveAt = new Date();

      // Update context if needed
      if (botResponse.contextUpdate) {
        conversation.context = {
          ...conversation.context,
          ...botResponse.contextUpdate,
        };
      }

      await conversation.save();

      // Get user info for logging
      const user = await this.userModel
        .findById(userId)
        .lean()
        .exec()
        .catch(() => null);

      // Log successful AI interaction
      await this.activityLogsService
        .createAiLog({
          aiModel: this.chatGPTService.isEnabled()
            ? AiModel.GPT4
            : AiModel.CUSTOM,
          prompt: message,
          response: botResponse.message || JSON.stringify(botResponse),
          tokensUsed: botResponse.tokensUsed || 0,
          responseTime: duration,
          userId: new Types.ObjectId(userId),
          userName: user ? `${user.firstName} ${user.lastName}` : undefined,
          conversationId: conversation.sessionId,
          status: 'success',
        })
        .catch((err) => console.error('Failed to log AI interaction:', err));

      return {
        sessionId: conversation.sessionId,
        message: botResponse.message,
        intent,
        confidence,
        responseType: botResponse.responseType || ResponseType.TEXT,
        actions: botResponse.actions || [],
        quickReplies: botResponse.quickReplies || [],
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log failed AI interaction
      const errorMessage = error.message || 'Unknown error occurred';
      await this.activityLogsService
        .createAiLog({
          aiModel: this.chatGPTService.isEnabled()
            ? AiModel.GPT4
            : AiModel.CUSTOM,
          prompt: message,
          response: `Error: ${errorMessage}`,
          tokensUsed: 0,
          responseTime: duration,
          userId: new Types.ObjectId(userId),
          conversationId: conversation.sessionId,
          status: 'error',
          errorMessage: errorMessage,
        })
        .catch((err) => console.error('Failed to log AI error:', err));

      throw error;
    }
  }

  private async detectIntent(
    message: string,
    conversation?: BotConversation,
  ): Promise<{ intent: BotIntent; confidence: number }> {
    // Try ChatGPT first if enabled
    if (this.chatGPTService.isEnabled() && conversation) {
      try {
        const gptResult = await this.chatGPTService.detectIntentWithGPT(
          message,
          conversation.messages || [],
        );
        if (gptResult.confidence > 0.7) {
          return { intent: gptResult.intent, confidence: gptResult.confidence };
        }
      } catch (error) {
        console.log(
          'ChatGPT intent detection failed, falling back to keywords',
        );
      }
    }

    // Fallback to keyword-based detection
    const lowerMessage = message.toLowerCase();

    // Simple keyword-based intent detection (can be replaced with ML model)
    const intentPatterns = [
      {
        intent: BotIntent.GREETING,
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
        confidence: 0.95,
      },
      {
        intent: BotIntent.GOODBYE,
        keywords: ['bye', 'goodbye', 'see you', 'thanks', 'thank you'],
        confidence: 0.9,
      },
      {
        intent: BotIntent.COURSE_INQUIRY,
        keywords: ['course', 'learn', 'study', 'class', 'lesson', 'curriculum'],
        confidence: 0.85,
      },
      {
        intent: BotIntent.ENROLLMENT_HELP,
        keywords: [
          'enroll',
          'register',
          'sign up',
          'join course',
          'start learning',
        ],
        confidence: 0.85,
      },
      {
        intent: BotIntent.PAYMENT_ISSUE,
        keywords: [
          'payment',
          'pay',
          'credit card',
          'billing',
          'charge',
          'invoice',
        ],
        confidence: 0.9,
      },
      {
        intent: BotIntent.TECHNICAL_SUPPORT,
        keywords: [
          'error',
          'bug',
          'not working',
          'broken',
          'problem',
          'issue',
          'technical',
        ],
        confidence: 0.85,
      },
      {
        intent: BotIntent.REFUND_REQUEST,
        keywords: ['refund', 'money back', 'cancel order', 'return'],
        confidence: 0.95,
      },
      {
        intent: BotIntent.CERTIFICATE_INQUIRY,
        keywords: ['certificate', 'diploma', 'credential', 'completion'],
        confidence: 0.9,
      },
      {
        intent: BotIntent.ACCOUNT_HELP,
        keywords: ['account', 'password', 'login', 'profile', 'settings'],
        confidence: 0.85,
      },
      {
        intent: BotIntent.COMPLAINT,
        keywords: [
          'complaint',
          'disappointed',
          'angry',
          'terrible',
          'worst',
          'bad',
        ],
        confidence: 0.9,
      },
      {
        intent: BotIntent.HUMAN_AGENT_REQUEST,
        keywords: [
          'human',
          'agent',
          'talk to someone',
          'representative',
          'person',
        ],
        confidence: 0.95,
      },
    ];

    for (const pattern of intentPatterns) {
      for (const keyword of pattern.keywords) {
        if (lowerMessage.includes(keyword)) {
          return { intent: pattern.intent, confidence: pattern.confidence };
        }
      }
    }

    return { intent: BotIntent.GENERAL_QUESTION, confidence: 0.5 };
  }

  private async generateResponse(
    intent: BotIntent,
    message: string,
    conversation: BotConversation,
    userId: string,
  ): Promise<any> {
    // Detect action requests in the message
    const actionRequest = this.detectActionRequest(message);

    // If action is detected, execute it
    if (actionRequest) {
      const actionResult = await this.executeAction(
        actionRequest.action,
        message,
        userId,
        conversation,
        actionRequest.data,
      );

      if (actionResult && actionResult.success !== false) {
        return {
          message:
            actionResult.message ||
            `✅ Action "${actionRequest.action}" completed successfully!`,
          responseType: ResponseType.TEXT,
          quickReplies: ['View result', 'Create another', 'Main menu'],
          actions: [],
          contextUpdate: {
            lastAction: actionRequest.action,
            lastActionResult: actionResult,
          },
        };
      } else {
        return {
          message:
            actionResult?.error ||
            `❌ Failed to execute action "${actionRequest.action}". Please try again.`,
          responseType: ResponseType.TEXT,
          quickReplies: ['Try again', 'Get help'],
        };
      }
    }

    // Try ChatGPT for natural responses if enabled
    if (this.chatGPTService.isEnabled()) {
      try {
        const gptResponse = await this.chatGPTService.generateResponseWithGPT(
          message,
          intent,
          conversation.messages || [],
          conversation.context,
        );

        // Check if GPT response contains action hints
        const gptAction = this.detectActionFromResponse(gptResponse.message);
        if (gptAction) {
          const actionResult = await this.executeAction(
            gptAction.action,
            message,
            userId,
            conversation,
            gptAction.data,
          );

          if (actionResult && actionResult.success !== false) {
            return {
              message: `${gptResponse.message}\n\n✅ ${actionResult.message || 'Action completed!'}`,
              responseType: ResponseType.TEXT,
              quickReplies: gptResponse.quickReplies,
              actions: gptResponse.suggestedActions,
            };
          }
        }

        return {
          message: gptResponse.message,
          responseType: ResponseType.TEXT,
          quickReplies: gptResponse.quickReplies,
          actions: gptResponse.suggestedActions,
        };
      } catch (error) {
        console.log(
          'ChatGPT response generation failed, falling back to templates',
        );
      }
    }

    // Fallback to template-based responses
    // Check knowledge base first
    const knowledgeResponse = await this.searchKnowledge(message, intent);

    if (knowledgeResponse && knowledgeResponse.confidence > 0.7) {
      return {
        message: knowledgeResponse.answer,
        responseType: knowledgeResponse.responseType,
        quickReplies: knowledgeResponse.quickReplies,
      };
    }

    // Intent-based responses
    switch (intent) {
      case BotIntent.GREETING:
        return {
          message: `Hello! 👋 I'm your Personal Wings AI assistant. How can I help you today?`,
          quickReplies: [
            'Browse courses',
            'Check my enrollments',
            'Payment help',
            'Technical support',
            'Create a course',
            'Write a blog',
          ],
        };

      case BotIntent.GOODBYE:
        return {
          message: `Thank you for chatting with me! Have a great day! 😊 Feel free to reach out anytime you need help.`,
          contextUpdate: { conversationEnding: true },
        };

      case BotIntent.COURSE_INQUIRY:
        // Execute search action
        const searchResults = await this.executeAction(
          'search_courses',
          message,
          userId,
          conversation,
        );

        if (searchResults && searchResults.length > 0) {
          const courseList = searchResults
            .map((c, i) => `${i + 1}. ${c.title} - $${c.price}`)
            .join('\n');

          return {
            message: `I found these courses for you:\n\n${courseList}\n\nWould you like details about any of these?`,
            quickReplies: searchResults.slice(0, 3).map((c) => c.title),
            actions: ['view_course_details'],
            responseType: ResponseType.LIST,
            contextUpdate: { lastSearchResults: searchResults },
          };
        }

        return {
          message: `I'd be happy to help you find the perfect course! 📚 What topic are you interested in learning?`,
          quickReplies: [
            'Web Development',
            'Data Science',
            'Business',
            'Design',
            'Browse all courses',
          ],
          actions: ['search_courses'],
        };

      case BotIntent.ENROLLMENT_HELP:
        // Get user's enrollments
        const enrollments = await this.executeAction(
          'get_my_enrollments',
          message,
          userId,
          conversation,
        );

        if (enrollments && enrollments.length > 0) {
          return {
            message: `You're currently enrolled in ${enrollments.length} course(s). Here are your active courses:\n\n${enrollments
              .slice(0, 3)
              .map(
                (e: any, i: number) =>
                  `${i + 1}. ${e.course?.title || 'Course'} - ${e.progress || 0}% complete`,
              )
              .join(
                '\n',
              )}\n\nWould you like to:\n• Continue learning\n• View all enrollments\n• Find new courses`,
            quickReplies: [
              'View all enrollments',
              'Find courses',
              'Check progress',
            ],
            actions: ['view_enrollments'],
          };
        }

        return {
          message: `I can help you enroll in a course! To get started:\n\n1️⃣ Choose a course\n2️⃣ Click "Enroll Now"\n3️⃣ Complete payment\n4️⃣ Start learning!\n\nWould you like me to show you available courses?`,
          quickReplies: ['Show courses', 'Payment options', 'Talk to human'],
        };

      case BotIntent.PAYMENT_ISSUE:
        // Check user's orders and pending payments
        const orders = await this.executeAction(
          'get_my_orders',
          message,
          userId,
          conversation,
        );

        if (orders && orders.length > 0) {
          const pendingOrders = orders.filter((o: any) =>
            ['pending', 'processing'].includes(o.status),
          );

          if (pendingOrders.length > 0) {
            return {
              message: `I found ${pendingOrders.length} pending order(s):\n\n${pendingOrders
                .map(
                  (o: any, i: number) =>
                    `${i + 1}. Order #${o.orderNumber || 'N/A'} - $${o.total} (${o.status})`,
                )
                .join(
                  '\n',
                )}\n\n💳 Payment methods\n📋 Order history\n🔄 Retry payment\n💰 Refund requests\n\nWhat would you like assistance with?`,
              quickReplies: [
                'Retry payment',
                'Request refund',
                'Talk to human',
              ],
              actions: ['check_payment_status'],
            };
          }
        }

        return {
          message: `I understand you're having payment issues. I can help with:\n\n💳 Payment methods\n📋 Order history\n🔄 Retry payment\n💰 Refund requests\n\nWhat would you like assistance with?`,
          quickReplies: [
            'View my orders',
            'Payment methods',
            'Request refund',
            'Talk to human',
          ],
          actions: ['check_payment_status'],
        };

      case BotIntent.TECHNICAL_SUPPORT:
        await this.createSupportTask(
          conversation._id as any,
          userId,
          'technical_issue',
          { message },
        );
        return {
          message: `I've logged your technical issue. Let me help troubleshoot:\n\n🔧 Try refreshing the page\n🔧 Clear browser cache\n🔧 Check internet connection\n\nIs the problem resolved, or would you like me to escalate to our technical team?`,
          quickReplies: [
            'Problem solved',
            'Still not working',
            'Talk to technician',
          ],
        };

      case BotIntent.REFUND_REQUEST:
        return {
          message: `I can help you with a refund request. Our refund policy:\n\n✅ 30-day money-back guarantee\n✅ Full or partial refunds available\n✅ Process time: 5-7 business days\n\nWould you like to:\n\n1️⃣ Start a refund request\n2️⃣ Check existing refund\n3️⃣ Learn more about policy`,
          quickReplies: [
            'Request refund',
            'Check refund status',
            'Refund policy',
          ],
          actions: ['navigate_to_refunds'],
        };

      case BotIntent.CERTIFICATE_INQUIRY:
        // Check user's certificate eligibility
        if (conversation.context?.currentCourseId) {
          const eligibility = await this.executeAction(
            'check_certificate_eligibility',
            message,
            userId,
            conversation,
          );

          if (eligibility && !eligibility.error) {
            if (eligibility.eligible) {
              return {
                message: `🎉 Congratulations! You're eligible for your certificate!\n\n✅ Progress: ${eligibility.progress}%\n✅ Quizzes Passed: ${eligibility.quizzesPassed}\n✅ Assignments: ${eligibility.assignmentsCompleted}\n\nYou can download your certificate from your course dashboard.`,
                quickReplies: [
                  'View certificate',
                  'Share achievement',
                  'Continue learning',
                ],
              };
            } else {
              return {
                message: `You're making progress! Here's what you need for your certificate:\n\n${eligibility.requirements.progressComplete ? '✅' : '❌'} Complete all lessons\n${eligibility.requirements.quizPassed ? '✅' : '❌'} Pass quizzes\n${eligibility.requirements.assignmentsComplete ? '✅' : '❌'} Complete assignments\n\nCurrent progress: ${eligibility.progress}%\n\nKeep going - you're almost there! 💪`,
                quickReplies: ['Continue course', 'Check progress', 'Get help'],
              };
            }
          }
        }

        return {
          message: `Certificates are awarded upon course completion! 🎓\n\nTo earn your certificate:\n✔️ Complete all lessons\n✔️ Pass quizzes (80%+ score)\n✔️ Meet attendance requirements\n\nWould you like to check your progress?`,
          quickReplies: [
            'Check progress',
            'View certificates',
            'Certificate requirements',
          ],
        };

      case BotIntent.ACCOUNT_HELP:
        return {
          message: `I can help with account-related issues:\n\n👤 Profile settings\n🔐 Password reset\n📧 Email verification\n⚙️ Preferences\n\nWhat do you need help with?`,
          quickReplies: [
            'Reset password',
            'Update profile',
            'Email issues',
            'Talk to human',
          ],
        };

      case BotIntent.COMPLAINT:
        await this.escalateToHuman(conversation.sessionId, 'complaint', userId);
        return {
          message: `I'm sorry to hear about your experience. 😔 Your feedback is very important to us. I've escalated this to our customer service team who will reach out to you shortly.\n\nWould you like to provide more details?`,
          quickReplies: ['Add details', 'Wait for agent', 'Browse help center'],
          contextUpdate: { escalated: true },
        };

      case BotIntent.HUMAN_AGENT_REQUEST:
        await this.escalateToHuman(
          conversation.sessionId,
          'user_request',
          userId,
        );
        return {
          message: `I'm connecting you with a human agent. A team member will join this conversation shortly. Average wait time: 2-5 minutes. ⏱️`,
          contextUpdate: { waitingForAgent: true },
        };

      default:
        return {
          message: `I didn't quite understand that. Could you rephrase your question? I can help you create courses, write blogs, search content, or perform other actions. What would you like me to do?`,
          quickReplies: [
            'Create a course',
            'Write a blog',
            'Search courses',
            'Common questions',
          ],
        };
    }
  }

  private async searchKnowledge(
    query: string,
    intent: BotIntent,
  ): Promise<any> {
    const keywords = query
      .toLowerCase()
      .split(' ')
      .filter((word) => word.length > 3);

    const knowledge = await this.knowledgeBaseModel
      .findOne({
        $or: [
          { keywords: { $in: keywords } },
          { relatedIntents: intent },
          { question: { $regex: keywords.join('|'), $options: 'i' } },
        ],
        isActive: true,
      })
      .sort({ usageCount: -1 })
      .exec();

    if (knowledge) {
      knowledge.usageCount += 1;
      await knowledge.save();

      return {
        answer: knowledge.answer,
        confidence: 0.8,
        responseType: knowledge.responseType,
        quickReplies: knowledge.responseData?.quickReplies,
      };
    }

    return null;
  }

  private async createSupportTask(
    conversationId: any,
    userId: string,
    taskType: string,
    taskData: any,
  ): Promise<void> {
    const task = new this.botTaskModel({
      conversationId,
      userId,
      taskType,
      taskData,
      status: 'pending',
      priority: 'medium',
    });
    await task.save();
  }

  // Task Management Methods
  async createTask(createTaskDto: any, createdBy?: string): Promise<any> {
    const task = new this.botTaskModel({
      ...createTaskDto,
      createdBy,
      status: 'pending',
      priority: createTaskDto.priority || 'medium',
      scheduledFor: createTaskDto.scheduledFor
        ? new Date(createTaskDto.scheduledFor)
        : undefined,
    });
    return task.save();
  }

  async getTasks(filters: any): Promise<any> {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      taskType,
    } = filters;
    const query: any = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (taskType) query.taskType = taskType;

    const total = await this.botTaskModel.countDocuments(query).exec();
    const tasks = await this.botTaskModel
      .find(query)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('conversationId')
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTaskById(taskId: string): Promise<any> {
    return this.botTaskModel
      .findById(taskId)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('conversationId')
      .exec();
  }

  async updateTask(taskId: string, updateDto: any): Promise<any> {
    const task = await this.botTaskModel.findById(taskId).exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (updateDto.status) {
      task.status = updateDto.status;

      if (updateDto.status === 'processing' && !task.startedAt) {
        task.startedAt = new Date();
      }

      if (updateDto.status === 'completed' || updateDto.status === 'failed') {
        task.completedAt = new Date();
      }
    }

    if (updateDto.result) task.result = updateDto.result;
    if (updateDto.errorMessage) task.errorMessage = updateDto.errorMessage;
    if (updateDto.assignedTo) task.assignedTo = updateDto.assignedTo;

    return task.save();
  }

  async assignTask(taskId: string, assignedTo: string): Promise<any> {
    return this.updateTask(taskId, { assignedTo, status: 'processing' });
  }

  async bulkAssignTasks(taskIds: string[], assignedTo: string): Promise<any> {
    const updated = await this.botTaskModel
      .updateMany(
        { _id: { $in: taskIds } },
        { $set: { assignedTo, status: 'processing', startedAt: new Date() } },
      )
      .exec();

    return {
      assigned: updated.modifiedCount,
      total: taskIds.length,
    };
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.botTaskModel.findByIdAndDelete(taskId).exec();
  }

  async getTaskStats(): Promise<any> {
    const [total, pending, processing, completed, failed] = await Promise.all([
      this.botTaskModel.countDocuments().exec(),
      this.botTaskModel.countDocuments({ status: 'pending' }).exec(),
      this.botTaskModel.countDocuments({ status: 'processing' }).exec(),
      this.botTaskModel.countDocuments({ status: 'completed' }).exec(),
      this.botTaskModel.countDocuments({ status: 'failed' }).exec(),
    ]);

    const priorityDistribution = await this.botTaskModel
      .aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }])
      .exec();

    const taskTypeDistribution = await this.botTaskModel
      .aggregate([{ $group: { _id: '$taskType', count: { $sum: 1 } } }])
      .exec();

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      priorityDistribution,
      taskTypeDistribution,
    };
  }

  async escalateToHuman(
    sessionId: string,
    reason: string,
    userId: string,
  ): Promise<any> {
    const conversation = await this.botConversationModel
      .findOne({ sessionId })
      .exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.status = ConversationStatus.ESCALATED;

    // Create a support ticket automatically
    await this.createSupportTask(
      conversation._id as any,
      userId,
      'escalate_to_human',
      {
        reason,
        conversationHistory: conversation.messages,
      },
    );

    await conversation.save();

    return {
      message: 'Successfully escalated to human agent',
      sessionId,
    };
  }

  async getConversationHistory(
    userId: string,
    sessionId?: string,
  ): Promise<any> {
    const query: any = { userId };
    if (sessionId) query.sessionId = sessionId;

    const conversations = await this.botConversationModel
      .find(query)
      .sort({ lastActiveAt: -1 })
      .limit(sessionId ? 1 : 10)
      .exec();

    return conversations;
  }

  // Detect action requests from user messages
  private detectActionRequest(
    message: string,
  ): { action: string; data?: any } | null {
    const lowerMessage = message.toLowerCase();

    // Course creation patterns
    if (
      lowerMessage.match(/create.*course|make.*course|new course|add course/i)
    ) {
      // Extract course details from message
      const titleMatch =
        message.match(/(?:title|name)[: ]*([^,\.\n]+)/i) ||
        message.match(/course (?:called|named|titled) ([^,\.\n]+)/i) ||
        message.match(
          /create (?:a |an )?course (?:about |on |for )?([^,\.\n]+)/i,
        );
      const priceMatch = message.match(/(?:price|cost)[: ]*\$?(\d+)/i);
      const descMatch = message.match(/(?:description|about)[: ]*([^,\.\n]+)/i);

      return {
        action: 'create_course',
        data: {
          title: titleMatch ? titleMatch[1].trim() : 'New Course',
          description: descMatch
            ? descMatch[1].trim()
            : 'A new course created by AI Assistant',
          price: priceMatch ? parseFloat(priceMatch[1]) : 0,
          level: lowerMessage.includes('advanced')
            ? 'advanced'
            : lowerMessage.includes('intermediate')
              ? 'intermediate'
              : 'beginner',
          type: 'online',
          duration: 10,
        },
      };
    }

    // Blog creation patterns
    if (
      lowerMessage.match(
        /create.*blog|write.*blog|new blog|post.*blog|publish.*blog/i,
      )
    ) {
      const titleMatch =
        message.match(/(?:title|about)[: ]*([^,\.\n]+)/i) ||
        message.match(/blog (?:about|on) ([^,\.\n]+)/i);
      const contentMatch = message.match(/(?:content|write)[: ]*([^,\.\n]+)/i);

      return {
        action: 'create_blog',
        data: {
          title: titleMatch ? titleMatch[1].trim() : 'New Blog Post',
          content: contentMatch ? contentMatch[1].trim() : message,
          excerpt: message.substring(0, 150),
        },
      };
    }

    // Update course patterns
    if (
      lowerMessage.match(
        /update.*course|edit.*course|modify.*course|change.*course/i,
      )
    ) {
      const courseIdMatch = message.match(/(?:course|id)[: ]*([a-f0-9]{24})/i);
      return {
        action: 'update_course',
        data: {
          courseId: courseIdMatch ? courseIdMatch[1] : null,
        },
      };
    }

    // Delete course patterns
    if (lowerMessage.match(/delete.*course|remove.*course/i)) {
      const courseIdMatch = message.match(/(?:course|id)[: ]*([a-f0-9]{24})/i);
      return {
        action: 'delete_course',
        data: {
          courseId: courseIdMatch ? courseIdMatch[1] : null,
        },
      };
    }

    return null;
  }

  // Detect actions from AI response
  private detectActionFromResponse(
    response: string,
  ): { action: string; data?: any } | null {
    // This can be enhanced to parse structured responses from GPT
    return null;
  }

  async rateConversation(
    sessionId: string,
    rating: number,
    feedback?: string,
  ): Promise<any> {
    const conversation = await this.botConversationModel
      .findOne({ sessionId })
      .exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.satisfactionRating = rating;
    if (feedback) conversation.satisfactionFeedback = feedback;
    conversation.status = ConversationStatus.RESOLVED;
    conversation.resolvedAt = new Date();

    await conversation.save();

    return { message: 'Thank you for your feedback!' };
  }

  async deleteConversation(sessionId: string, userId: string): Promise<any> {
    const conversation = await this.botConversationModel
      .findOne({ sessionId, userId })
      .exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.botConversationModel.findByIdAndDelete(conversation._id).exec();

    return { message: 'Conversation deleted successfully' };
  }

  async getStatus(): Promise<any> {
    const isOpenAIEnabled = this.chatGPTService.isEnabled();
    const isGeminiEnabled = !!this.chatGPTService['geminiApiKey'];

    return {
      status: 'online',
      aiEnabled: isOpenAIEnabled || isGeminiEnabled,
      openAIEnabled: isOpenAIEnabled,
      geminiEnabled: isGeminiEnabled,
      timestamp: new Date().toISOString(),
    };
  }

  // Knowledge base management
  async addKnowledge(
    createKnowledgeDto: CreateKnowledgeDto,
  ): Promise<KnowledgeBase> {
    const knowledge = new this.knowledgeBaseModel(createKnowledgeDto);
    return knowledge.save();
  }

  async updateKnowledge(
    id: string,
    updates: Partial<CreateKnowledgeDto>,
  ): Promise<KnowledgeBase | null> {
    return this.knowledgeBaseModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
  }

  async deleteKnowledge(id: string): Promise<void> {
    await this.knowledgeBaseModel.findByIdAndDelete(id).exec();
  }

  async getKnowledgeBase(filters: any): Promise<any> {
    const { page = 1, limit = 20, category } = filters;
    const query: any = {};
    if (category) query.category = category;

    const total = await this.knowledgeBaseModel.countDocuments(query).exec();
    const knowledge = await this.knowledgeBaseModel
      .find(query)
      .sort({ usageCount: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      knowledge,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Analytics
  async getBotAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const query: any = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const analytics = await this.botAnalyticsModel
      .find(query)
      .sort({ date: -1 })
      .exec();

    const summary = {
      totalConversations: 0,
      resolvedByBot: 0,
      escalatedToHuman: 0,
      averageSatisfaction: 0,
      resolutionRate: 0,
    };

    analytics.forEach((day) => {
      summary.totalConversations += day.totalConversations;
      summary.resolvedByBot += day.resolvedByBot;
      summary.escalatedToHuman += day.escalatedToHuman;
      summary.averageSatisfaction += day.averageSatisfaction;
    });

    if (analytics.length > 0) {
      summary.averageSatisfaction /= analytics.length;
      summary.resolutionRate =
        (summary.resolvedByBot / summary.totalConversations) * 100;
    }

    return { summary, dailyAnalytics: analytics };
  }

  // Initialize default knowledge base
  private async initializeDefaultKnowledge(): Promise<void> {
    const count = await this.knowledgeBaseModel.countDocuments().exec();
    if (count > 0) return;

    const defaultKnowledge = [
      {
        category: 'Getting Started',
        question: 'How do I create an account?',
        answer:
          'Creating an account is easy! Click the "Sign Up" button, enter your email, create a password, and verify your email. You\'ll be ready to start learning!',
        keywords: ['account', 'sign up', 'register', 'create'],
        relatedIntents: [BotIntent.ACCOUNT_HELP],
      },
      {
        category: 'Payments',
        question: 'What payment methods do you accept?',
        answer:
          'We accept: Credit/Debit Cards (Visa, Mastercard, Amex), PayPal, and Bank Transfers. All payments are secure and encrypted.',
        keywords: ['payment', 'methods', 'credit card', 'paypal'],
        relatedIntents: [BotIntent.PAYMENT_ISSUE],
      },
      {
        category: 'Courses',
        question: 'Can I preview a course before purchasing?',
        answer:
          'Yes! Most courses offer free preview lessons. Look for the "Preview" button on the course page to watch sample content.',
        keywords: ['preview', 'try', 'sample', 'free'],
        relatedIntents: [BotIntent.COURSE_INQUIRY],
      },
    ];

    await this.knowledgeBaseModel.insertMany(defaultKnowledge);
  }

  private async executeAction(
    action: string,
    query: string,
    userId: string,
    conversation: BotConversation,
    actionData?: any,
  ): Promise<any> {
    try {
      switch (action) {
        case 'search_courses':
          return await this.botActionsService.searchCourses(query);

        case 'get_my_enrollments':
          return await this.botActionsService.getUserEnrollments(userId);

        case 'get_my_orders':
          return await this.botActionsService.getUserOrders(userId);

        case 'check_progress':
          const courseId = conversation.context?.currentCourseId;
          if (courseId) {
            return await this.botActionsService.getEnrollmentProgress(
              userId,
              courseId,
            );
          }
          return null;

        case 'get_popular_courses':
          return await this.botActionsService.getPopularCourses();

        case 'get_recommended_courses':
          return await this.botActionsService.getRecommendedCourses(userId);

        case 'check_certificate_eligibility':
          const certCourseId = conversation.context?.currentCourseId;
          if (certCourseId) {
            return await this.botActionsService.checkCertificateEligibility(
              userId,
              certCourseId,
            );
          }
          return null;

        case 'get_user_stats':
          return await this.botActionsService.getUserStats(userId);

        case 'search_everything':
          return await this.botActionsService.searchEverything(query, userId);

        // ADMIN ACTIONS - Course Management
        case 'create_course':
          const courseData =
            actionData || conversation.context?.courseData || {};
          return await this.botActionsService.createCourse(courseData, userId);

        case 'update_course':
          const updateCourseData =
            actionData || conversation.context?.updateCourseData || {};
          const updateCourseId = updateCourseData.courseId || query;
          return await this.botActionsService.updateCourse(
            updateCourseId,
            updateCourseData,
            userId,
          );

        case 'delete_course':
          const deleteCourseId = actionData?.courseId || query;
          return await this.botActionsService.deleteCourse(
            deleteCourseId,
            userId,
          );

        case 'get_all_courses_admin':
          return await this.botActionsService.getAllCoursesAdmin(
            actionData || {},
          );

        // ADMIN ACTIONS - Blog Management
        case 'create_blog':
          const blogData = actionData || conversation.context?.blogData || {};
          return await this.botActionsService.createBlog(blogData);

        default:
          return null;
      }
    } catch (error) {
      console.error(`Action execution error (${action}):`, error);
      return null;
    }
  }

  // ============================================
  // AI AGENT MANAGEMENT METHODS
  // ============================================

  async getAllAgents(filters?: any) {
    try {
      const query: any = {};

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.agentType) {
        query.agentType = filters.agentType;
      }

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive === 'true';
      }

      const agents = await this.aiAgentModel
        .find(query)
        .sort({ createdAt: -1 })
        .exec();

      return agents;
    } catch (error) {
      throw new BadRequestException('Failed to fetch agents');
    }
  }

  async getAgent(id: string) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async createAgent(createAgentDto: any, createdBy: string) {
    try {
      const iconColors = [
        { bg: 'bg-primary/10', color: 'text-primary' },
        { bg: 'bg-accent/10', color: 'text-accent' },
        { bg: 'bg-yellow-100', color: 'text-yellow-600' },
        { bg: 'bg-purple-100', color: 'text-purple-600' },
        { bg: 'bg-blue-100', color: 'text-blue-600' },
        { bg: 'bg-green-100', color: 'text-green-600' },
      ];

      const randomIcon =
        iconColors[Math.floor(Math.random() * iconColors.length)];

      const agent = new this.aiAgentModel({
        ...createAgentDto,
        iconBg: randomIcon.bg,
        iconColor: randomIcon.color,
        conversations: 0,
        avgResponseSec: 1.0,
        isActive: true,
      });

      await agent.save();
      return agent;
    } catch (error) {
      throw new BadRequestException('Failed to create agent');
    }
  }

  async updateAgent(id: string, updateAgentDto: any) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    Object.assign(agent, updateAgentDto);
    await agent.save();

    return agent;
  }

  async toggleAgentStatus(
    id: string,
    status: 'active' | 'inactive' | 'training',
  ) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    agent.status = status;
    agent.isActive = status === 'active';
    await agent.save();

    return agent;
  }

  async duplicateAgent(id: string) {
    const originalAgent = await this.aiAgentModel.findById(id).exec();

    if (!originalAgent) {
      throw new NotFoundException('Agent not found');
    }

    const duplicatedAgent = new this.aiAgentModel({
      name: `${originalAgent.name} (Copy)`,
      description: originalAgent.description,
      agentType: originalAgent.agentType,
      status: 'inactive',
      knowledgeBase: originalAgent.knowledgeBase,
      isActive: false,
      conversations: 0,
      avgResponseSec: originalAgent.avgResponseSec,
      iconBg: originalAgent.iconBg,
      iconColor: originalAgent.iconColor,
    });

    await duplicatedAgent.save();
    return duplicatedAgent;
  }

  async deleteAgent(id: string) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    await this.aiAgentModel.findByIdAndDelete(id).exec();

    return { message: 'Agent deleted successfully' };
  }

  async getAgentsAnalytics() {
    try {
      const totalAgents = await this.aiAgentModel.countDocuments().exec();
      const activeAgents = await this.aiAgentModel
        .countDocuments({ status: 'active' })
        .exec();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Today's conversations
      const conversationsToday = await this.botConversationModel
        .countDocuments({
          createdAt: { $gte: today },
        })
        .exec();

      // Yesterday's conversations for trend
      const conversationsYesterday = await this.botConversationModel
        .countDocuments({
          createdAt: { $gte: yesterday, $lt: today },
        })
        .exec();

      // Calculate conversation trend
      const conversationTrend =
        conversationsYesterday > 0
          ? Math.round(
              ((conversationsToday - conversationsYesterday) /
                conversationsYesterday) *
                100,
            )
          : conversationsToday > 0
            ? 100
            : 0;

      // Average response times
      const avgResponseTimes = await this.aiAgentModel
        .aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: null, avgResponse: { $avg: '$avgResponseSec' } } },
        ])
        .exec();

      const currentAvgResponseTime =
        avgResponseTimes.length > 0 ? avgResponseTimes[0].avgResponse : 1.2;

      // Last week's average response time for trend
      const lastWeekConvs = await this.botConversationModel
        .find({
          createdAt: { $gte: lastWeek, $lt: yesterday },
        })
        .exec();

      // Calculate average response time from last week
      let lastWeekAvgResponse = 1.2;
      if (lastWeekConvs.length > 0) {
        const totalTime = lastWeekConvs.reduce((sum, conv) => {
          const duration = conv.messages.length > 1 ? 1.5 : 1.0;
          return sum + duration;
        }, 0);
        lastWeekAvgResponse = totalTime / lastWeekConvs.length;
      }

      const responseTrend =
        lastWeekAvgResponse > 0
          ? parseFloat(
              (currentAvgResponseTime - lastWeekAvgResponse).toFixed(1),
            )
          : 0;

      // Satisfaction ratings
      const satisfactionRatings = await this.botConversationModel
        .aggregate([
          {
            $match: {
              satisfactionRating: { $exists: true },
              createdAt: { $gte: today },
            },
          },
          { $group: { _id: null, avgRating: { $avg: '$satisfactionRating' } } },
        ])
        .exec();

      const lastWeekSatisfaction = await this.botConversationModel
        .aggregate([
          {
            $match: {
              satisfactionRating: { $exists: true },
              createdAt: { $gte: lastWeek, $lt: yesterday },
            },
          },
          { $group: { _id: null, avgRating: { $avg: '$satisfactionRating' } } },
        ])
        .exec();

      const currentSatisfaction =
        satisfactionRatings.length > 0 ? satisfactionRatings[0].avgRating : 4.5;
      const lastWeekSatisfactionAvg =
        lastWeekSatisfaction.length > 0
          ? lastWeekSatisfaction[0].avgRating
          : 4.5;

      const satisfactionRate = parseFloat(
        ((currentSatisfaction / 5) * 100).toFixed(0),
      );
      const lastWeekSatisfactionRate = parseFloat(
        ((lastWeekSatisfactionAvg / 5) * 100).toFixed(0),
      );
      const satisfactionTrend = satisfactionRate - lastWeekSatisfactionRate;

      return {
        activeAgents,
        dailyConversations: conversationsToday,
        avgResponseTime: parseFloat(currentAvgResponseTime.toFixed(1)),
        satisfactionRate,
        conversationTrend,
        responseTrend,
        satisfactionTrend,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch analytics');
    }
  }

  async getAgentConversations(agentId?: string) {
    try {
      const query: any = {
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      };

      const conversations = await this.botConversationModel
        .find(query)
        .populate('userId', 'name email profilePicture')
        .sort({ createdAt: -1 })
        .limit(50)
        .exec();

      const agents = await this.aiAgentModel.find({ status: 'active' }).exec();

      if (agents.length === 0) {
        return [];
      }

      const formatted = conversations.map((conv: any) => {
        // Intelligent agent assignment based on conversation context
        let assignedAgent;

        // If agentId filter is specified, use that agent
        if (agentId) {
          assignedAgent = agents.find(
            (a) => (a as any)._id.toString() === agentId,
          );
        }

        // Otherwise, assign based on conversation intent
        if (!assignedAgent && conv.messages && conv.messages.length > 0) {
          const firstMessage = conv.messages[0];
          const intent = firstMessage.intent || '';

          // Match agent type to conversation intent
          if (intent.includes('COURSE') || intent.includes('LEARNING')) {
            assignedAgent = agents.find(
              (a) => a.agentType === 'Course Advisor',
            );
          } else if (intent.includes('ASSIGNMENT') || intent.includes('TASK')) {
            assignedAgent = agents.find(
              (a) => a.agentType === 'Assignment Helper',
            );
          } else if (intent.includes('PROGRESS') || intent.includes('TRACK')) {
            assignedAgent = agents.find(
              (a) => a.agentType === 'Progress Tracker',
            );
          } else if (intent.includes('STUDY') || intent.includes('HELP')) {
            assignedAgent = agents.find(
              (a) => a.agentType === 'Study Assistant',
            );
          } else if (
            intent.includes('LANGUAGE') ||
            intent.includes('TRANSLATE')
          ) {
            assignedAgent = agents.find(
              (a) => a.agentType === 'Language Tutor',
            );
          }
        }

        // Fallback: use round-robin or least loaded agent
        if (!assignedAgent) {
          // Find agent with lowest conversation count or use first agent
          assignedAgent =
            agents.length > 0
              ? agents.reduce((minAgent, currentAgent) =>
                  currentAgent.conversations < minAgent.conversations
                    ? currentAgent
                    : minAgent,
                )
              : null;
        }

        const duration = Math.floor(Math.random() * 20) + 3;

        return {
          _id: conv._id,
          studentName: conv.userId?.name || 'Unknown User',
          studentAvatar:
            conv.userId?.profilePicture ||
            'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
          agentName: assignedAgent?.name || 'AI Assistant',
          agentId: assignedAgent?._id,
          agentType: assignedAgent?.agentType,
          started: this.getTimeAgo(conv.createdAt),
          duration: `${duration} min`,
          status:
            conv.status === 'resolved' || conv.status === 'closed'
              ? 'Completed'
              : 'In Progress',
        };
      });

      return formatted;
    } catch (error) {
      throw new BadRequestException('Failed to fetch conversations');
    }
  }

  async getAgentLogs(id: string) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const conversations = await this.botConversationModel
      .find()
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    return {
      agent,
      totalConversations: conversations.length,
      logs: conversations,
    };
  }

  async getConversationMessages(conversationId: string) {
    const conversation = await this.botConversationModel
      .findById(conversationId)
      .populate('userId', 'name email profilePicture')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation.messages || [];
  }

  async testAgent(id: string, message: string, context: any, userId: string) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Create a test session ID
    const testSessionId = `test_${id}_${Date.now()}`;

    // Send message through normal flow
    const result = await this.sendMessage(userId, {
      message,
      sessionId: testSessionId,
      context: { ...context, isTest: true, agentId: id },
    });

    return {
      ...result,
      agentName: agent.name,
      agentType: agent.agentType,
      isTest: true,
    };
  }

  async getAgentConfig(id: string) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return {
      id: agent._id,
      name: agent.name,
      description: agent.description,
      agentType: agent.agentType,
      status: agent.status,
      knowledgeBase: agent.knowledgeBase,
      isActive: agent.isActive,
      // Additional config that can be extended
      config: {
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        responseFormat: 'text',
      },
    };
  }

  async updateAgentConfig(id: string, configDto: any) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Update basic agent properties
    if (configDto.name) agent.name = configDto.name;
    if (configDto.description) agent.description = configDto.description;
    if (configDto.agentType) agent.agentType = configDto.agentType;
    if (configDto.knowledgeBase) agent.knowledgeBase = configDto.knowledgeBase;

    await agent.save();

    return this.getAgentConfig(id);
  }

  async getAgentAnalytics(id: string, startDate?: Date, endDate?: Date) {
    const agent = await this.aiAgentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Get conversations for this agent (in reality, you'd track agent-conversation relationships)
    const conversations = await this.botConversationModel
      .find({
        createdAt: { $gte: start, $lte: end },
      })
      .exec();

    const totalConversations = conversations.length;
    const completedConversations = conversations.filter(
      (c) => c.status === 'resolved' || c.status === 'closed',
    ).length;

    const avgMessagesPerConv =
      totalConversations > 0
        ? conversations.reduce((sum, c) => sum + c.messages.length, 0) /
          totalConversations
        : 0;

    const satisfactionRatings = conversations
      .filter(
        (c) =>
          c.satisfactionRating !== undefined && c.satisfactionRating !== null,
      )
      .map((c) => c.satisfactionRating as number);

    const avgSatisfaction =
      satisfactionRatings.length > 0
        ? satisfactionRatings.reduce((sum, r) => sum + r, 0) /
          satisfactionRatings.length
        : 0;

    // Calculate success rate
    const successRate =
      totalConversations > 0
        ? (completedConversations / totalConversations) * 100
        : 0;

    return {
      agentId: id,
      agentName: agent.name,
      period: { start, end },
      metrics: {
        totalConversations,
        completedConversations,
        activeConversations: totalConversations - completedConversations,
        avgMessagesPerConversation: parseFloat(avgMessagesPerConv.toFixed(1)),
        avgSatisfactionRating: parseFloat(avgSatisfaction.toFixed(2)),
        satisfactionPercentage: parseFloat(
          ((avgSatisfaction / 5) * 100).toFixed(0),
        ),
        successRate: parseFloat(successRate.toFixed(1)),
        avgResponseTime: agent.avgResponseSec,
      },
      conversationsByDay: await this.getConversationsByDay(start, end),
      topIntents: await this.getTopIntents(start, end),
      satisfactionTrend: await this.getSatisfactionTrend(start, end),
    };
  }

  private async getConversationsByDay(startDate: Date, endDate: Date) {
    const conversations = await this.botConversationModel
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return conversations.map((c) => ({
      date: c._id,
      count: c.count,
    }));
  }

  private async getTopIntents(startDate: Date, endDate: Date) {
    const conversations = await this.botConversationModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .exec();

    const intentCounts: Record<string, number> = {};

    conversations.forEach((conv) => {
      conv.messages.forEach((msg) => {
        if (msg.intent) {
          intentCounts[msg.intent] = (intentCounts[msg.intent] || 0) + 1;
        }
      });
    });

    return Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async getSatisfactionTrend(startDate: Date, endDate: Date) {
    const conversations = await this.botConversationModel
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            satisfactionRating: { $exists: true },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            avgRating: { $avg: '$satisfactionRating' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return conversations.map((c) => ({
      date: c._id,
      avgRating: parseFloat(c.avgRating.toFixed(2)),
      count: c.count,
    }));
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }

    return 'Just now';
  }
}
