import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BunnyProvider {
  constructor(private readonly configService: ConfigService) {}

  private getLibraryId(): string {
    const id = this.configService.get<string>('BUNNY_STREAM_LIBRARY_ID');
    if (!id) throw new BadRequestException('Missing BUNNY_STREAM_LIBRARY_ID');
    return id;
  }

  private getApiKey(): string {
    const key = this.configService.get<string>('BUNNY_API_KEY');
    if (!key) throw new BadRequestException('Missing BUNNY_API_KEY');
    return key;
  }

  private getBaseUrl(): string {
    return `https://video.bunnycdn.com/library/${this.getLibraryId()}`;
  }

  private getStorageZone(): string {
    const zone = this.configService.get<string>('BUNNY_STORAGE_ZONE');
    if (!zone) throw new BadRequestException('Missing BUNNY_STORAGE_ZONE');
    return zone;
  }

  private getStorageKey(): string {
    const key = this.configService.get<string>('BUNNY_STORAGE_ACCESS_KEY');
    if (!key) throw new BadRequestException('Missing BUNNY_STORAGE_ACCESS_KEY');
    return key;
  }

  private getPullHost(): string | undefined {
    return this.configService.get<string>('BUNNY_PULL_ZONE_HOST');
  }

  async uploadFile(
    file: Express.Multer.File,
    options: { title?: string } = {},
  ): Promise<any> {
    const createRes = await fetch(`${this.getBaseUrl()}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        AccessKey: this.getApiKey(),
      },
      body: JSON.stringify({
        title: options.title || file.originalname || 'video',
      }),
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      throw new BadRequestException(`Bunny create video failed: ${txt}`);
    }

    const createJson: any = await createRes.json();
    const videoId: string =
      createJson.guid || createJson.videoId || createJson.id;
    if (!videoId)
      throw new BadRequestException('Bunny create video missing id');

    const uploadRes = await fetch(`${this.getBaseUrl()}/videos/${videoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        AccessKey: this.getApiKey(),
      },
      body: new Uint8Array(file.buffer as any),
    });

    if (!uploadRes.ok) {
      const txt = await uploadRes.text();
      throw new BadRequestException(`Bunny upload failed: ${txt}`);
    }

    const secureUrl = `https://iframe.mediadelivery.net/embed/${this.getLibraryId()}/${videoId}`;

    return {
      public_id: videoId,
      secure_url: secureUrl,
      bytes: file.size,
      resource_type: 'video',
    };
  }

  async uploadFileToStorage(
    file: Express.Multer.File,
    options: { folder?: string; fileName?: string } = {},
  ): Promise<any> {
    const folder = options.folder?.replace(/^\/+|\/+$/g, '') || 'uploads';
    const fileName = options.fileName || file.originalname;
    const path = `${folder}/${fileName}`.replace(/\/+/, '/');

    const url = `https://storage.bunnycdn.com/${this.getStorageZone()}/${path}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        AccessKey: this.getStorageKey(),
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(file.buffer as any),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new BadRequestException(`Bunny storage upload failed: ${txt}`);
    }

    const pullHost = this.getPullHost();
    const secureUrl = pullHost ? `https://${pullHost}/${path}` : url;

    return {
      public_id: path,
      secure_url: secureUrl,
      bytes: file.size,
      resource_type: 'raw',
    };
  }

  async deleteStorageFile(publicId: string): Promise<any> {
    const url = `https://storage.bunnycdn.com/${this.getStorageZone()}/${publicId.replace(/^\/+/, '')}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { AccessKey: this.getStorageKey() },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new BadRequestException(`Bunny storage delete failed: ${txt}`);
    }
    return { success: true };
  }

  async uploadFromUrl(
    url: string,
    options: { title?: string } = {},
  ): Promise<any> {
    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      throw new BadRequestException(`Fetch source failed: ${txt}`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const file: any = {
      buffer: buf,
      originalname: options.title || 'video',
      mimetype: 'video/mp4',
      size: buf.length,
    };
    return this.uploadFile(file, { title: options.title });
  }

  async deleteFile(publicId: string): Promise<any> {
    const delRes = await fetch(`${this.getBaseUrl()}/videos/${publicId}`, {
      method: 'DELETE',
      headers: { AccessKey: this.getApiKey() },
    });
    if (!delRes.ok) {
      const txt = await delRes.text();
      throw new BadRequestException(`Bunny delete failed: ${txt}`);
    }
    return { success: true };
  }
}
