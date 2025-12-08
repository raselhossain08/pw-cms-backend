import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { ContactService } from '../services/contact.service';

/**
 * Script to fix contact data by resetting it to default values
 * Run with: npx ts-node -r tsconfig-paths/register src/cms/contact/scripts/fix-contact-data.ts
 */
async function fixContactData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const contactService = app.get(ContactService);

  try {
    console.log('🔍 Checking for existing contact data...');

    const contacts = await contactService.findAll();

    if (contacts.length === 0) {
      console.log('✅ No contacts found. Creating default contact...');
      await contactService.getOrCreateDefault();
      console.log('✅ Default contact created successfully!');
    } else {
      console.log(
        `📝 Found ${contacts.length} contact(s). Updating with proper data...`,
      );

      for (const contact of contacts) {
        const contactId = (contact as any)._id.toString();
        console.log(`\n🔧 Updating contact: ${contactId}`);

        // Check if data is missing or incomplete
        const needsUpdate =
          !contact.contactInfo?.email ||
          !contact.contactInfo?.location ||
          !contact.formSection?.badge ||
          !contact.formSection?.title ||
          !contact.mapSection?.embedUrl;

        if (needsUpdate) {
          console.log('⚠️  Contact has missing data. Applying fixes...');

          const updateData = {
            contactInfo: {
              email: contact.contactInfo?.email || 'letsfly@personalwings.com',
              location: contact.contactInfo?.location || 'San Diego, CA, USA',
              phone: contact.contactInfo?.phone,
            },
            formSection: {
              badge: contact.formSection?.badge || 'Get In Touch',
              title:
                contact.formSection?.title ||
                'Ready to Start Your Aviation Journey?',
              image: contact.formSection?.image || '/icons/support.svg',
              imageAlt:
                contact.formSection?.imageAlt ||
                'Customer support illustration',
            },
            mapSection: {
              embedUrl:
                contact.mapSection?.embedUrl ||
                'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d429155.3775090909!2d-117.38993949677734!3d32.82415014414925!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d9530fad921e4b%3A0x8c46637beb8c19b!2sSan%20Diego%2C%20CA%2C%20USA!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus',
              showMap: contact.mapSection?.showMap ?? true,
            },
            seo: {
              title: contact.seo?.title || 'Contact Us - Personal Wings',
              description:
                contact.seo?.description ||
                'Get in touch with Personal Wings for all your aviation needs',
              keywords:
                contact.seo?.keywords || 'contact, aviation, personal wings',
            },
            isActive: contact.isActive ?? true,
          };

          await contactService.update(contactId, updateData);
          console.log('✅ Contact updated successfully!');
        } else {
          console.log('✅ Contact data is complete. No update needed.');
        }
      }
    }

    console.log('\n✅ Contact data fix completed successfully!');

    // Display final state
    const finalContacts = await contactService.findAll();
    console.log('\n📊 Final Contact Data:');
    console.log(JSON.stringify(finalContacts, null, 2));
  } catch (error) {
    console.error('❌ Error fixing contact data:', error);
    throw error;
  } finally {
    await app.close();
  }
}

fixContactData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
