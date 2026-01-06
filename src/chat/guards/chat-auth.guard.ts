import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class ChatAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Try to extract token from Authorization header
    let token = this.extractTokenFromHeader(request);

    // If not in header, try to get from cookies (for guest users)
    if (!token) {
      token = this.extractTokenFromCookie(request);
    }

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user info to request object
      request['user'] = {
        id: payload.sub,
        email: payload.email,
        role: payload.role || 'user',
        name: payload.name,
        conversationId: payload.conversationId,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    // Parse cookies manually if needed
    const cookies = request.headers.cookie;
    if (!cookies) return undefined;

    const chatTokenCookie = cookies
      .split(';')
      .find((cookie) => cookie.trim().startsWith('chat_token='));

    if (!chatTokenCookie) return undefined;

    return chatTokenCookie.split('=')[1];
  }
}
