import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faqs, FaqsDocument } from '../schemas/faqs.schema';
import { CreateFaqsDto, UpdateFaqsDto } from '../dto/faqs.dto';

@Injectable()
export class FaqsService {
  constructor(@InjectModel(Faqs.name) private faqsModel: Model<FaqsDocument>) {}

  async create(createFaqsDto: CreateFaqsDto): Promise<Faqs> {
    const faqs = new this.faqsModel(createFaqsDto);
    return faqs.save();
  }

  async findAll(): Promise<Faqs[]> {
    return this.faqsModel.find().exec();
  }

  async findActive(): Promise<Faqs | null> {
    return this.faqsModel.findOne({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<Faqs> {
    const faqs = await this.faqsModel.findById(id).exec();
    if (!faqs) {
      throw new NotFoundException(`FAQs with ID ${id} not found`);
    }
    return faqs;
  }

  async update(id: string, updateFaqsDto: UpdateFaqsDto): Promise<Faqs> {
    const faqs = await this.faqsModel
      .findByIdAndUpdate(id, updateFaqsDto, { new: true })
      .exec();
    if (!faqs) {
      throw new NotFoundException(`FAQs with ID ${id} not found`);
    }
    return faqs;
  }

  async delete(id: string): Promise<void> {
    const result = await this.faqsModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`FAQs with ID ${id} not found`);
    }
  }

  async getOrCreateDefault(): Promise<Faqs> {
    let faqs = await this.faqsModel.findOne().exec();

    if (!faqs) {
      const defaultFaqs: CreateFaqsDto = {
        headerSection: {
          badge: 'FAQs',
          title: 'How can we help you?',
          description:
            "Find answers to common questions about our flight training programs, aircraft sales, and services. Can't find what you're looking for? Contact our team for personalized assistance.",
        },
        categories: [
          {
            name: 'All',
            icon: 'MessageCircle',
            count: 0,
            color: 'bg-blue-100 text-blue-800',
          },
          {
            name: 'Flight Training',
            icon: 'Plane',
            count: 0,
            color: 'bg-green-100 text-green-800',
          },
          {
            name: 'Courses',
            icon: 'GraduationCap',
            count: 0,
            color: 'bg-purple-100 text-purple-800',
          },
          {
            name: 'Billing',
            icon: 'CreditCard',
            count: 0,
            color: 'bg-yellow-100 text-yellow-800',
          },
          {
            name: 'Certification',
            icon: 'ShieldCheck',
            count: 0,
            color: 'bg-red-100 text-red-800',
          },
          {
            name: 'Aircraft Sales',
            icon: 'Users',
            count: 0,
            color: 'bg-indigo-100 text-indigo-800',
          },
          {
            name: 'Support',
            icon: 'Headphones',
            count: 0,
            color: 'bg-gray-100 text-gray-800',
          },
        ],
        faqs: [
          {
            question: 'What flight training programs do you offer?',
            answer:
              'Personal Wings offers comprehensive flight training programs including Pro Line 21 Avionics Training, Pro Line Fusion Avionics Training, New Jet Pilot Transition Course, Eclipse Jet Transition Course, and specialized type ratings for turboprop and light jet aircraft. All training is conducted by experienced professionals led by Captain Rich Pickett.',
            category: 'Flight Training',
            tags: ['training', 'programs', 'courses', 'avionics'],
            isActive: true,
            order: 1,
          },
          {
            question: 'Who is Captain Rich Pickett?',
            answer:
              'Captain Rich Pickett is our Chief Flight Instructor and founder with over 15,000 flight hours of experience. He specializes in high-performance aircraft, turboprop, and light jet training. Captain Pickett holds multiple type ratings and has extensive experience in both civilian and military aviation, making him uniquely qualified to provide world-class flight instruction.',
            category: 'Flight Training',
            tags: ['instructor', 'captain', 'experience', 'qualifications'],
            isActive: true,
            order: 2,
          },
          {
            question: 'How much do your training courses cost?',
            answer:
              'Course pricing varies depending on the specific training program. Our New Jet Pilot Transition Course is $2,500, Turboprop Aircraft Training is $3,200, Light Jet Type Rating is $4,500, and other specialized courses range from $2,200 to $3,500. We often offer discounts and package deals. Contact us for current pricing and financing options.',
            category: 'Billing',
            tags: ['pricing', 'cost', 'fees', 'payment'],
            isActive: true,
            order: 3,
          },
          {
            question: 'Do you offer financing options for training courses?',
            answer:
              'Yes, we understand flight training is a significant investment. We work with several financing partners to provide flexible payment options including monthly payment plans, deferred payment programs, and educational loans specifically designed for aviation training. Contact our team to discuss the best financing solution for your needs.',
            category: 'Billing',
            tags: ['financing', 'payment plans', 'loans', 'installments'],
            isActive: true,
            order: 4,
          },
          {
            question: 'What aircraft do you use for training?',
            answer:
              'We use a diverse fleet of modern aircraft including Cirrus SR22, King Air C90, Eclipse jets, and other high-performance aircraft depending on the specific training program. All aircraft are meticulously maintained and equipped with the latest avionics systems to provide realistic, professional-grade training experience.',
            category: 'Flight Training',
            tags: ['aircraft', 'fleet', 'equipment', 'maintenance'],
            isActive: true,
            order: 5,
          },
          {
            question: 'Are your courses approved for insurance requirements?',
            answer:
              'Yes, all Personal Wings training programs meet or exceed insurance company requirements for high-performance aircraft, turboprop, and light jet operations. We provide comprehensive documentation and certificates upon course completion that satisfy most insurance training mandates. We recommend confirming specific requirements with your insurance provider.',
            category: 'Certification',
            tags: ['insurance', 'certification', 'approval', 'requirements'],
            isActive: true,
            order: 6,
          },
          {
            question: 'How long does it take to complete a training course?',
            answer:
              'Course duration varies by program complexity and your schedule flexibility. Most courses can be completed in 1-2 weeks of intensive training, or spread over several weeks for part-time students. Ground school typically takes 15-25 hours, with flight training ranging from 10-40 hours depending on the aircraft type and your experience level.',
            category: 'Courses',
            tags: ['duration', 'timeline', 'schedule', 'completion'],
            isActive: true,
            order: 7,
          },
          {
            question: 'What are the prerequisites for your training programs?',
            answer:
              "Prerequisites vary by course, but generally require a valid Private Pilot Certificate or higher with current medical certificate. Most programs require minimum flight experience as specified by insurance or regulatory requirements. Some advanced courses may require instrument rating or commercial certificate. We'll assess your qualifications during the enrollment process.",
            category: 'Courses',
            tags: [
              'prerequisites',
              'requirements',
              'qualifications',
              'certificates',
            ],
            isActive: true,
            order: 8,
          },
          {
            question: 'Do you provide aircraft sales and brokerage services?',
            answer:
              'Yes, Personal Wings offers comprehensive aircraft brokerage services for high-performance single-engine, turboprop, and light jet aircraft. We provide expert guidance throughout the acquisition process, including pre-purchase inspections, market analysis, and transaction management. Our extensive network helps connect buyers with quality aircraft.',
            category: 'Aircraft Sales',
            tags: ['brokerage', 'sales', 'acquisition', 'aircraft buying'],
            isActive: true,
            order: 9,
          },
          {
            question: 'Can you help with aircraft pre-purchase inspections?',
            answer:
              'Absolutely. We coordinate comprehensive pre-purchase inspections with certified mechanics and avionics specialists. Our inspection process covers airframe, engine, avionics, and compliance issues. We provide detailed reports and recommendations to help you make informed purchasing decisions and negotiate fair pricing.',
            category: 'Aircraft Sales',
            tags: ['inspection', 'pre-purchase', 'evaluation', 'mechanics'],
            isActive: true,
            order: 10,
          },
          {
            question: 'What is your refund policy for training courses?',
            answer:
              "We offer a 30-day money-back guarantee for course enrollment. Refunds are available for courses that haven't exceeded 30% completion. For courses accessed beyond this threshold, partial refunds may be considered on a case-by-case basis. Please review our complete refund policy on our website for detailed terms and conditions.",
            category: 'Billing',
            tags: ['refund', 'cancellation', 'money-back', 'guarantee'],
            isActive: true,
            order: 11,
          },
          {
            question: 'Do you offer recurrent training programs?',
            answer:
              'Yes, we provide recurrent training programs to help maintain proficiency and meet insurance requirements. These programs include system reviews, emergency procedures practice, and flight proficiency checks. We recommend annual recurrent training for turboprop and jet aircraft operators to maintain the highest safety standards.',
            category: 'Certification',
            tags: ['recurrent', 'proficiency', 'annual', 'refresher'],
            isActive: true,
            order: 12,
          },
          {
            question: 'Can I get college credit for your training programs?',
            answer:
              "While Personal Wings doesn't directly offer college credit, many of our students have successfully used our training certificates for college credit through their institution's prior learning assessment programs. We provide detailed curriculum documentation and completion certificates that many colleges accept for aviation degree programs.",
            category: 'Certification',
            tags: ['college credit', 'degree', 'academic', 'certification'],
            isActive: true,
            order: 13,
          },
          {
            question: 'Where are you located and do you travel for training?',
            answer:
              'Personal Wings is based in San Diego, California. While most training is conducted at our home base, we can arrange training at other locations for specialized programs or group training. We also provide ferry pilot services and can deliver aircraft as part of our comprehensive service offerings.',
            category: 'Support',
            tags: ['location', 'travel', 'San Diego', 'mobile training'],
            isActive: true,
            order: 14,
          },
          {
            question: 'How do I schedule a training course?',
            answer:
              "To schedule training, contact us through our website contact form, email letsfly@personalwings.com, or chat with our AI assistant. We'll discuss your goals, assess your qualifications, check aircraft availability, and customize a training program that fits your schedule and budget. We recommend booking 2-4 weeks in advance for optimal scheduling.",
            category: 'Support',
            tags: ['scheduling', 'booking', 'contact', 'enrollment'],
            isActive: true,
            order: 15,
          },
        ],
        isActive: true,
        seo: {
          title: 'FAQs - Personal Wings Flight Training',
          description:
            'Find answers to frequently asked questions about Personal Wings flight training programs, aircraft sales, certification, and support services.',
          keywords:
            'flight training FAQ, aviation questions, pilot training, aircraft sales FAQ, flight school questions',
        },
      };

      faqs = (await this.create(defaultFaqs)) as any;
    }

    return faqs as any;
  }
}
