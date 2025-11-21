import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
    @ApiProperty({
        description: 'URL of the uploaded file',
        example: '/uploads/images/1234567890-logo.webp'
    })
    url: string;

    @ApiProperty({
        description: 'Original filename',
        example: 'logo.png'
    })
    originalName: string;

    @ApiProperty({
        description: 'File size in bytes',
        example: 45678
    })
    size: number;

    @ApiProperty({
        description: 'MIME type of the file',
        example: 'image/webp'
    })
    mimeType: string;
}

export class MultipleUploadResponseDto {
    @ApiProperty({
        description: 'Array of uploaded files',
        type: [UploadResponseDto]
    })
    files: UploadResponseDto[];
}
