import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

@Injectable()
export class BruteForceGuard implements CanActivate {
  private loginAttempts = new Map<string, LoginAttempt>();
  private maxAttempts = 5;
  private windowMs = 15 * 60 * 1000; // 15 minutes
  private blockDurationMs = 30 * 60 * 1000; // 30 minutes

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const identifier = this.getIdentifier(request);

    const attempt = this.loginAttempts.get(identifier);
    const now = Date.now();

    // Check if currently blocked
    if (attempt?.blockedUntil && now < attempt.blockedUntil) {
      const remainingMinutes = Math.ceil((attempt.blockedUntil - now) / 60000);
      throw new HttpException(
        `Too many login attempts. Account locked for ${remainingMinutes} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Reset if window expired
    if (attempt && now - attempt.firstAttempt > this.windowMs) {
      this.loginAttempts.delete(identifier);
      return true;
    }

    // Check attempt count
    if (attempt && attempt.count >= this.maxAttempts) {
      // Block the account
      attempt.blockedUntil = now + this.blockDurationMs;
      this.loginAttempts.set(identifier, attempt);

      console.error(`[BRUTE FORCE DETECTED] Identifier: ${identifier}`);

      throw new HttpException(
        `Too many failed login attempts. Account locked for 30 minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Record attempt
    if (!attempt) {
      this.loginAttempts.set(identifier, {
        count: 1,
        firstAttempt: now,
      });
    } else {
      attempt.count++;
      this.loginAttempts.set(identifier, attempt);
    }

    return true;
  }

  private getIdentifier(request: any): string {
    // Use email from body or IP address as identifier
    const email = request.body?.email;
    const ip = request.ip || request.connection.remoteAddress;
    return email || ip;
  }

  // Method to reset attempts (after successful login)
  resetAttempts(identifier: string) {
    this.loginAttempts.delete(identifier);
  }

  // Method to manually unblock
  unblockAccount(identifier: string) {
    this.loginAttempts.delete(identifier);
  }
}
