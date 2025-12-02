import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private blockedIPs = new Set<string>();
  private suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL Injection
    /<script[^>]*>.*?<\/script>/gi, // XSS
    /(\.\.(\/|\\))+/g, // Path Traversal
    /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval|expression)/gi, // SQL Keywords
    /(\$\{.*\})|(\#\{.*\})/g, // Template Injection
    /(wget|curl|system|exec|bash|sh|cmd|powershell)/gi, // Command Injection
  ];

  use(req: Request, res: Response, next: NextFunction) {
    const clientIp = this.getClientIP(req);

    try {
      const nodeEnv = process.env.NODE_ENV || 'development';
      const isDevLocal =
        nodeEnv === 'development' &&
        (clientIp === '127.0.0.1' ||
          clientIp === '::1' ||
          clientIp === '::ffff:127.0.0.1' ||
          clientIp.startsWith('192.168.') ||
          clientIp.startsWith('10.') ||
          clientIp.startsWith('172.16.') ||
          clientIp.startsWith('172.17.') ||
          clientIp.startsWith('172.18.') ||
          clientIp.startsWith('172.19.') ||
          clientIp.startsWith('172.20.') ||
          clientIp.startsWith('172.21.') ||
          clientIp.startsWith('172.22.') ||
          clientIp.startsWith('172.23.') ||
          clientIp.startsWith('172.24.') ||
          clientIp.startsWith('172.25.') ||
          clientIp.startsWith('172.26.') ||
          clientIp.startsWith('172.27.') ||
          clientIp.startsWith('172.28.') ||
          clientIp.startsWith('172.29.') ||
          clientIp.startsWith('172.30.') ||
          clientIp.startsWith('172.31.'));
      const isDocsOrFavicon =
        req.path?.startsWith('/api/docs') || req.path === '/favicon.ico';
      const isPublicPath = req.path?.startsWith('/api/public/');
      const isCmsActiveGet =
        req.method === 'GET' &&
        /^\/api\/cms\/[^/]+\/active$/.test(req.path || '');

      if (isDocsOrFavicon || isPublicPath || isCmsActiveGet || isDevLocal) {
        this.addSecurityHeaders(res);
        const requestSignature = this.generateRequestSignature(req);
        (req as any).securitySignature = requestSignature;
        return next();
      }

      if (this.blockedIPs.has(clientIp)) {
        throw new HttpException(
          'Access denied. Your IP has been blocked due to suspicious activity.',
          HttpStatus.FORBIDDEN,
        );
      }

      this.enforceRateLimit(clientIp);

      this.validateHeaders(req);
      this.scanForThreats(req, clientIp);
      this.validateContentType(req);

      this.addSecurityHeaders(res);
      const requestSignature = this.generateRequestSignature(req);
      (req as any).securitySignature = requestSignature;

      next();
    } catch (error) {
      console.error(
        `[SECURITY ALERT] IP: ${clientIp}, Path: ${req.path}`,
        error?.message,
      );
      this.handleSecurityViolation(clientIp);
      throw error;
    }
  }

  private getClientIP(req: Request): string {
    const ipRaw =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';
    if (!ipRaw) return 'unknown';
    if (ipRaw === '::1') return '127.0.0.1';
    if (ipRaw.startsWith('::ffff:')) return ipRaw.replace('::ffff:', '');
    return ipRaw;
  }

  private enforceRateLimit(ip: string) {
    const now = Date.now();
    const limit = 100; // 100 requests per minute
    const windowMs = 60 * 1000; // 1 minute

    const record = this.requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return;
    }

    if (record.count >= limit) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
  }

  private validateHeaders(req: Request) {
    const value = req.headers['cookie'];
    if (typeof value === 'string' && this.containsMaliciousPattern(value)) {
      throw new HttpException(
        'Invalid request headers detected',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate Content-Length to prevent buffer overflow
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > 10 * 1024 * 1024) {
      // 10MB limit
      throw new HttpException(
        'Request payload too large',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }

  private scanForThreats(req: Request, ip: string) {
    const payload = JSON.stringify({
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body,
    });

    // Check for malicious patterns
    if (this.containsMaliciousPattern(payload)) {
      console.error(
        `[THREAT DETECTED] IP: ${ip}, Payload: ${payload.substring(0, 200)}`,
      );
      throw new HttpException(
        'Malicious request detected',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check for MongoDB injection
    if (
      this.containsMongoDBInjection(req.query) ||
      this.containsMongoDBInjection(req.body) ||
      this.containsMongoDBInjection(req.params)
    ) {
      console.error(`[MONGODB INJECTION] IP: ${ip}`);
      throw new HttpException(
        'Invalid request parameters',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private containsMongoDBInjection(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const mongoOperators = [
      '$gt',
      '$gte',
      '$lt',
      '$lte',
      '$ne',
      '$in',
      '$nin',
      '$and',
      '$or',
      '$not',
      '$nor',
      '$exists',
      '$type',
      '$expr',
      '$jsonSchema',
      '$mod',
      '$regex',
      '$text',
      '$where',
    ];

    const checkObject = (object: any): boolean => {
      if (Array.isArray(object)) {
        return object.some((item) => checkObject(item));
      }

      if (object && typeof object === 'object') {
        for (const key in object) {
          // Check if key is a MongoDB operator
          if (mongoOperators.includes(key)) {
            return true;
          }
          // Recursively check nested objects
          if (checkObject(object[key])) {
            return true;
          }
        }
      }

      return false;
    };

    return checkObject(obj);
  }

  private containsMaliciousPattern(input: string): boolean {
    return this.suspiciousPatterns.some((pattern) => pattern.test(input));
  }

  private validateContentType(req: Request) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];

      if (!contentType) {
        return; // Allow requests without content-type for some endpoints
      }

      const allowedTypes = [
        'application/json',
        'multipart/form-data',
        'application/x-www-form-urlencoded',
        'text/plain',
      ];

      const isAllowed = allowedTypes.some((type) => contentType.includes(type));

      if (!isAllowed) {
        throw new HttpException(
          'Invalid Content-Type',
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }
    }
  }

  private addSecurityHeaders(res: Response) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Strict Transport Security (HTTPS only)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.stripe.com;",
    );

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );

    // Remove server information
    res.removeHeader('X-Powered-By');
  }

  private generateRequestSignature(req: Request): string {
    const data = `${req.method}:${req.path}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private handleSecurityViolation(ip: string) {
    const violations = this.requestCounts.get(ip)?.count || 0;

    // Block IP after 5 violations
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isLocal =
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      (ip.startsWith('172.') && parseInt(ip.split('.')[1] || '0', 10) >= 16);
    if (nodeEnv === 'development' && isLocal) {
      return;
    }
    if (violations >= 5) {
      this.blockedIPs.add(ip);
      console.error(`[IP BLOCKED] ${ip} - Multiple security violations`);
    }
  }

  // Method to manually unblock IP (admin use)
  unblockIP(ip: string) {
    this.blockedIPs.delete(ip);
    this.requestCounts.delete(ip);
  }

  // Method to get blocked IPs
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }
}
