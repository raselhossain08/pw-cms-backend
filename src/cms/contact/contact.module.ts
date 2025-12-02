import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contact, ContactSchema } from './schemas/contact.schema';
import { ContactService } from './services/contact.service';
import { ContactController } from './controllers/contact.controller';
import { CloudinaryService } from '../services/cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Contact.name, schema: ContactSchema }]),
  ],
  controllers: [ContactController],
  providers: [ContactService, CloudinaryService],
  exports: [ContactService],
})
export class ContactModule {}
