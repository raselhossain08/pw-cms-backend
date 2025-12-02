import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Testimonials } from '../schemas/testimonials.schema';

@Injectable()
export class TestimonialsSeeder {
  private readonly logger = new Logger(TestimonialsSeeder.name);

  constructor(
    @InjectModel(Testimonials.name)
    private testimonialsModel: Model<Testimonials>,
  ) {}

  async seed() {
    const count = await this.testimonialsModel.countDocuments();
    if (count > 0) {
      this.logger.log('Testimonials already seeded');
      return;
    }

    const testimonials = {
      title: "Pilot's Testimonials",
      subtitle: 'AVIATION EXCELLENCE',
      description: 'What our pilots say about their training experience',
      testimonials: [
        {
          name: 'Captain Michael Anderson',
          position: 'Commercial Pilot',
          company: 'Regional Airlines',
          avatar:
            'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
          rating: 5,
          comment:
            "Personal Wings provided exceptional turboprop training. Captain Rich's expertise and hands-on approach made the transition seamless. Highly recommended for professional pilots.",
          fallback: 'MA',
        },
        {
          name: 'Jennifer Martinez',
          position: 'Private Pilot',
          company: 'Corporate Aviation',
          avatar:
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
          rating: 5,
          comment:
            "The high performance aircraft training exceeded my expectations. The instructors were patient, knowledgeable, and focused on safety. Best flight training experience I've had.",
          fallback: 'JM',
        },
        {
          name: 'Robert Thompson',
          position: 'ATP Pilot',
          company: 'Charter Operations',
          avatar:
            'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',
          rating: 5,
          comment:
            'Outstanding light jet type rating program. The simulator sessions were realistic and the ground school was comprehensive. Personal Wings delivers world-class training.',
          fallback: 'RT',
        },
        {
          name: 'Sarah Williams',
          position: 'Flight Instructor',
          company: 'Part 141 School',
          avatar:
            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
          rating: 5,
          comment:
            "Professional, thorough, and safety-focused training. The Personal Wings team helped me achieve my aviation goals. I couldn't have asked for better instruction.",
          fallback: 'SW',
        },
      ],
      seo: {
        title: 'Pilot Testimonials | Personal Wings Training Reviews',
        description:
          'Read what our pilots say about their training experience at Personal Wings. Real reviews from commercial pilots, ATP holders, and flight instructors.',
        keywords:
          'pilot testimonials, flight training reviews, aviation training feedback, personal wings reviews',
        ogImage: '',
      },
      isActive: true,
    };

    await this.testimonialsModel.create(testimonials);
    this.logger.log('🎉 Testimonials seeding completed successfully!');
  }
}
