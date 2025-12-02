import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CSRF_PROTECTION_KEY } from '../decorators/csrf-protection.decorator';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  private tokens = new Map<string, { token: string; expires: number }>();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresCsrf = this.reflector.getAllAndOverride<boolean>(
      CSRF_PROTECTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only check CSRF for state-changing operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    const token = request.headers['x-csrf-token'] || request.body?._csrf;
    const sessionId = request.headers['x-session-id'] || request.sessionID;

    if (!token || !sessionId) {
      throw new HttpException('CSRF token missing', HttpStatus.FORBIDDEN);
    }

    const storedToken = this.tokens.get(sessionId);

    if (!storedToken) {
      throw new HttpException('Invalid CSRF token', HttpStatus.FORBIDDEN);
    }

    if (Date.now() > storedToken.expires) {
      this.tokens.delete(sessionId);
      throw new HttpException('CSRF token expired', HttpStatus.FORBIDDEN);
    }

    if (storedToken.token !== token) {
      throw new HttpException('Invalid CSRF token', HttpStatus.FORBIDDEN);
    }

    return true;
  }

  // Generate CSRF token
  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour

    this.tokens.set(sessionId, { token, expires });

    return token;
  }

  // Cleanup expired tokens
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}
