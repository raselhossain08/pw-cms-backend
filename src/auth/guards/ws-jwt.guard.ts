import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.user = payload;
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromHeader(client: any): string | undefined {
    const authHeader =
      client.handshake.auth.token || client.handshake.headers.authorization;
    return authHeader?.replace('Bearer ', '');
  }
}
