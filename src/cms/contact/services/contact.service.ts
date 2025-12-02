import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact, ContactDocument } from '../schemas/contact.schema';
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
  ) {}

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const contact = new this.contactModel(createContactDto);
    return contact.save();
  }

  async findAll(): Promise<Contact[]> {
    return this.contactModel.find().exec();
  }

  async findActive(): Promise<Contact> {
    const contact = await this.contactModel.findOne({ isActive: true }).exec();
    if (!contact) {
      throw new NotFoundException('Active contact page not found');
    }
    return contact;
  }

  async findOne(id: string): Promise<Contact> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    const contact = await this.contactModel.findById(id).exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
  ): Promise<Contact> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    const contact = await this.contactModel
      .findByIdAndUpdate(id, updateContactDto, { new: true })
      .exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    const result = await this.contactModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }

  async getOrCreateDefault(): Promise<Contact> {
    const contact = await this.contactModel.findOne({ isActive: true }).exec();
    if (contact) {
      return contact;
    }

    // Create default contact if none exists
    const defaultContact = new this.contactModel({
      contactInfo: {
        email: 'letsfly@personalwings.com',
        location: 'San Diego, CA, USA',
      },
      formSection: {
        badge: 'Get In Touch',
        title: 'Ready to Start Your Aviation Journey?',
        image: '/icons/support.svg',
        imageAlt: 'Customer support illustration',
      },
      mapSection: {
        embedUrl:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d429155.3775090909!2d-117.38993949677734!3d32.82415014414925!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d9530fad921e4b%3A0x8c46637beb8c19b!2sSan%20Diego%2C%20CA%2C%20USA!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus',
        showMap: true,
      },
      isActive: true,
      seo: {
        title: 'Contact Us - Personal Wings',
        description:
          'Get in touch with Personal Wings for all your aviation needs',
        keywords: 'contact, aviation, personal wings',
      },
    });

    return defaultContact.save();
  }
}
