import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Events } from '../schemas/events.schema';

@Injectable()
export class EventsSeeder {
  constructor(@InjectModel(Events.name) private eventsModel: Model<Events>) {}

  async seed() {
    const count = await this.eventsModel.countDocuments();
    if (count > 0) {
      console.log('Events section already seeded');
      return;
    }

    const seedData = {
      title: 'Upcoming Events',
      subtitle: 'JOIN OUR AVIATION COMMUNITY',
      events: [
        {
          id: 1,
          title: 'High Performance Aircraft Transition Course',
          image:
            'https://personalwings.com/wp-content/uploads/2019/06/CJ3-Fusion-Line-Up-and-Wait.jpg',
          date: '15 Dec 2024',
          time: '9:00 am - 5:00 pm',
          venue: 'Personal Wings',
          location: 'Florida',
          slug: 'high-performance-transition-course',
          description:
            'Master the transition to high-performance aircraft with our comprehensive training program.',
          price: 3499,
          videoUrl: 'https://www.youtube.com/watch?v=nA1Aqp0sPQo',
          trainingContent: [
            {
              text: 'Over 25 flight hours and 40+ hours of ground instruction',
            },
            { text: 'Advanced aerodynamics and aircraft systems training' },
            { text: 'High-altitude operations and oxygen system management' },
            { text: 'Emergency procedures and advanced flight maneuvers' },
            { text: 'Advanced navigation and flight planning techniques' },
            {
              text: 'Hands-on simulator training and real aircraft experience',
            },
          ],
          learningPoints: [
            { text: 'Master high-performance aircraft systems and operations' },
            {
              text: 'Advanced power management and fuel efficiency techniques',
            },
            { text: 'Complex aircraft handling and performance optimization' },
            {
              text: 'Emergency procedures specific to high-performance aircraft',
            },
            {
              text: 'Advanced weather analysis and decision-making for complex operations',
            },
          ],
          faqs: [
            {
              question: 'What are the prerequisites for this course?',
              answer:
                'You must hold at least a Private Pilot Certificate with an Airplane Single-Engine Land rating. A current medical certificate and valid photo ID are also required. Prior flight experience of at least 50 hours as pilot-in-command is recommended.',
            },
            {
              question: 'What aircraft will I train in?',
              answer:
                'Training is conducted in our fleet of high-performance aircraft including Cirrus SR22, Cessna 182RG, and Piper Saratoga. All aircraft are equipped with modern avionics including Garmin G1000 systems and are maintained to the highest standards.',
            },
            {
              question: 'How long does the training take?',
              answer:
                'The complete training program runs for 4 consecutive days from 9:00 AM to 4:00 PM. This includes 25+ flight hours and 40+ hours of ground instruction. We recommend arriving 15 minutes early each day for briefings.',
            },
            {
              question: 'Will I receive a certificate upon completion?',
              answer:
                "Yes! Upon successful completion of the course and passing the final evaluation, you'll receive an FAA-approved High Performance Aircraft endorsement and a Personal Wings training certificate recognized by insurance companies.",
            },
            {
              question: "What's included in the training fee?",
              answer:
                'The $3,499 fee includes all flight instruction, aircraft rental, ground school materials, simulator time, instructor fees, and your completion certificate. Additional costs may include fuel surcharges if applicable and optional study materials.',
            },
          ],
          instructors: [
            {
              name: 'Captain James Mitchell',
              title: 'Chief Flight Instructor',
              image:
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
              bio: 'ATP rated with over 12,000 flight hours. Specialized in high-performance and turboprop training with 20+ years of instructional experience.',
              social: {
                facebook: 'https://facebook.com',
                twitter: 'https://twitter.com',
                instagram: 'https://instagram.com',
              },
            },
            {
              name: 'Captain Sarah Rodriguez',
              title: 'Senior Flight Instructor',
              image:
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop',
              bio: 'Former military pilot with 8,500 hours. Expert in advanced aircraft systems and instrument flight instruction for complex aircraft.',
              social: {
                facebook: 'https://facebook.com',
                twitter: 'https://twitter.com',
                instagram: 'https://instagram.com',
              },
            },
          ],
          relatedEvents: [
            {
              title: 'Light Jet Type Rating Course',
              image:
                'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?q=80&w=600&auto=format&fit=crop',
              slug: 'light-jet-type-rating',
              badge: 'New Event',
            },
            {
              title: 'Multi-Engine Rating Program',
              image:
                'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?q=80&w=600&auto=format&fit=crop',
              slug: 'multi-engine-rating',
              badge: 'Popular',
            },
          ],
        },
        {
          id: 2,
          title: 'Turboprop Aircraft Training Workshop',
          image:
            'https://personalwings.com/wp-content/uploads/2019/06/citation-mustang-aircraft-brokerage.jpg',
          date: '22 Dec 2024',
          time: '8:00 am - 6:00 pm',
          venue: 'Personal Wings',
          location: 'Florida',
          slug: 'turboprop-training-workshop',
          description:
            'Comprehensive turboprop aircraft training for pilots looking to expand their capabilities.',
        },
        {
          id: 3,
          title: 'Light Jet Type Rating Seminar',
          image:
            'https://personalwings.com/wp-content/uploads/2022/10/pro-line-21-training-course-mfd-control-pedestal.webp',
          date: '05 Jan 2025',
          time: '9:00 am - 4:00 pm',
          venue: 'Personal Wings',
          location: 'Florida',
          slug: 'light-jet-type-rating-seminar',
          description:
            'Get your light jet type rating with expert instruction and hands-on experience.',
        },
        {
          id: 4,
          title: 'Aircraft Brokerage & Acquisition Expo',
          image:
            'https://personalwings.com/wp-content/uploads/2025/06/1.1-Jet-vs.-Piston-1280x731.webp',
          date: '18 Jan 2025',
          time: '10:00 am - 6:00 pm',
          venue: 'Personal Wings',
          location: 'Florida',
          slug: 'aircraft-brokerage-expo',
          description:
            'Explore aircraft acquisition opportunities and connect with industry experts.',
        },
      ],
      seo: {
        title: 'Upcoming Aviation Events | Personal Wings',
        description:
          'Join our upcoming aviation training events and workshops. Expand your skills with expert-led seminars and hands-on training programs.',
        keywords:
          'aviation events, flight training, aircraft seminars, aviation workshops, pilot training',
        ogImage:
          'https://personalwings.com/wp-content/uploads/2019/06/CJ3-Fusion-Line-Up-and-Wait.jpg',
      },
      isActive: true,
    };

    await this.eventsModel.create(seedData);
    console.log('Events section seeded successfully');
  }
}
