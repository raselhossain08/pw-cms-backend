import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  private helmetMiddleware = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: [
          "'self'",
          'https://api.openai.com',
          'https://api.stripe.com',
          'https://api.paypal.com',
          'wss:',
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // XSS Protection
    xssFilter: true,
    // Hide X-Powered-By header
    hidePoweredBy: true,
    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false,
    },
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.helmetMiddleware(req, res, next);
  }
}
