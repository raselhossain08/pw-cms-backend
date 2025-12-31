import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityConfigService } from '../../config/security.config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(private securityConfig: SecurityConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Apply security headers
    const securityHeaders = this.securityConfig.generateSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Additional security headers
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Request logging for security monitoring
    this.logSecurityRequest(req);

    next();
  }

  private logSecurityRequest(req: Request) {
    // In production, this would log to a security monitoring system
    const securityInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer'),
      contentType: req.get('Content-Type'),
    };

    // Log suspicious requests
    if (this.isSuspiciousRequest(req)) {
      console.warn('Suspicious request detected:', securityInfo);
    }
  }

  private isSuspiciousRequest(req: Request): boolean {
    // Check for common attack patterns
    const url = req.url.toLowerCase();
    const userAgent = req.get('User-Agent')?.toLowerCase() || '';

    // SQL injection patterns
    const sqlInjectionPatterns = [
      /select.*from/i,
      /union.*select/i,
      /insert.*into/i,
      /update.*set/i,
      /delete.*from/i,
      /drop.*table/i,
      /';/i,
      /--/i,
      /\/\*.*\*\//i,
    ];

    // XSS patterns
    const xssPatterns = [
      /<script>/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /onclick=/i,
      /alert\(/i,
      /document\.cookie/i,
      /window\.location/i,
    ];

    // Directory traversal patterns
    const traversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /etc\/passwd/i,
      /win\.ini/i,
    ];

    // Check URL for suspicious patterns
    for (const pattern of [
      ...sqlInjectionPatterns,
      ...xssPatterns,
      ...traversalPatterns,
    ]) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        return true;
      }
    }

    // Check for suspicious user agents
    const suspiciousUserAgents = [
      'nmap',
      'sqlmap',
      'wget',
      'curl',
      'nikto',
      'acunetix',
      'appscan',
      'burpsuite',
    ];

    if (suspiciousUserAgents.some((agent) => userAgent.includes(agent))) {
      return true;
    }

    return false;
  }
}
