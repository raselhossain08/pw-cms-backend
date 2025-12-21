import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AboutUs } from '../schemas/about-us.schema';

@Injectable()
export class AboutUsSeeder {
    constructor(
        @InjectModel(AboutUs.name)
        private aboutUsModel: Model<AboutUs>,
    ) { }

    async seed(): Promise<void> {
        const existingAboutUs = await this.aboutUsModel.findOne().exec();

        if (existingAboutUs) {
            console.log('About Us page already exists.');

            // Check if team members are missing and add them
            const needsTeamMembers = !existingAboutUs.teamSection?.members ||
                existingAboutUs.teamSection.members.length === 0;

            if (needsTeamMembers) {
                console.log('Adding team members to existing About Us page...');

                const defaultTeamMembers = [
                    {
                        id: 'team-1',
                        name: 'Captain John Smith',
                        position: 'Chief Flight Instructor',
                        image: '',
                        imageAlt: 'Captain John Smith',
                        bio: 'With over 15 years of aviation experience and 5000+ flight hours, dedicated to training the next generation of pilots.',
                        certifications: 'ATP, CFI, CFII, MEI',
                        isActive: true,
                        order: 1,
                    },
                    {
                        id: 'team-2',
                        name: 'Sarah Johnson',
                        position: 'Senior Flight Instructor',
                        image: '',
                        imageAlt: 'Sarah Johnson',
                        bio: 'Specializing in instrument training and complex aircraft operations with a passion for safety and excellence.',
                        certifications: 'CPL, CFI, CFII',
                        isActive: true,
                        order: 2,
                    },
                    {
                        id: 'team-3',
                        name: 'Michael Chen',
                        position: 'Flight Instructor',
                        image: '',
                        imageAlt: 'Michael Chen',
                        bio: 'Enthusiastic instructor focused on building confidence and proficiency in student pilots from day one.',
                        certifications: 'CPL, CFI',
                        isActive: true,
                        order: 3,
                    },
                ];

                // Update team section with members
                existingAboutUs.teamSection = {
                    isActive: true,
                    title: existingAboutUs.teamSection?.title || 'Meet Our Expert Instructors',
                    subtitle: existingAboutUs.teamSection?.subtitle || 'Our Team',
                    description: existingAboutUs.teamSection?.description || 'Our dedicated team of aviation professionals brings years of experience and passion to help you achieve your flight training goals.',
                    members: defaultTeamMembers,
                };

                await existingAboutUs.save();
                console.log('✅ Team members added successfully!');
            } else {
                console.log('Team members already exist, skipping team member seed.');
            }
            return;
        }

        console.log('Seeding About Us page...');

        const defaultAboutUs = {
            headerSection: {
                title: 'About Us',
                subtitle: 'LEARN MORE ABOUT PERSONAL WINGS',
                image: '',
                imageAlt: 'About Personal Wings',
            },
            sections: [
                {
                    id: 'mission',
                    title: 'Our Mission',
                    content: '<p>At Personal Wings, we are dedicated to providing exceptional aviation training and education. Our mission is to empower aspiring aviators with the knowledge, skills, and confidence they need to soar in their careers.</p><p>We believe in combining traditional aviation expertise with modern teaching methodologies to create a comprehensive learning experience that prepares students for real-world challenges.</p>',
                    isActive: true,
                    order: 1,
                },
                {
                    id: 'vision',
                    title: 'Our Vision',
                    content: '<p>To become the leading aviation training institution, recognized globally for excellence in education, innovation, and student success.</p><p>We envision a future where every student who passes through our programs emerges as a confident, skilled, and safety-conscious aviation professional.</p>',
                    isActive: true,
                    order: 2,
                },
                {
                    id: 'values',
                    title: 'Our Values',
                    content: '<ul><li><strong>Excellence:</strong> We strive for the highest standards in everything we do</li><li><strong>Safety First:</strong> Safety is our top priority in all training programs</li><li><strong>Innovation:</strong> We embrace new technologies and teaching methods</li><li><strong>Integrity:</strong> We conduct our business with honesty and transparency</li><li><strong>Student Success:</strong> Your success is our success</li></ul>',
                    isActive: true,
                    order: 3,
                },
            ],
            teamSection: {
                isActive: true,
                title: 'Meet Our Expert Instructors',
                subtitle: 'Our Team',
                description: 'Our dedicated team of aviation professionals brings years of experience and passion to help you achieve your flight training goals.',
                members: [
                    {
                        id: 'team-1',
                        name: 'Captain John Smith',
                        position: 'Chief Flight Instructor',
                        image: '',
                        imageAlt: 'Captain John Smith',
                        bio: 'With over 15 years of aviation experience and 5000+ flight hours, dedicated to training the next generation of pilots.',
                        certifications: 'ATP, CFI, CFII, MEI',
                        isActive: true,
                        order: 1,
                    },
                    {
                        id: 'team-2',
                        name: 'Sarah Johnson',
                        position: 'Senior Flight Instructor',
                        image: '',
                        imageAlt: 'Sarah Johnson',
                        bio: 'Specializing in instrument training and complex aircraft operations with a passion for safety and excellence.',
                        certifications: 'CPL, CFI, CFII',
                        isActive: true,
                        order: 2,
                    },
                    {
                        id: 'team-3',
                        name: 'Michael Chen',
                        position: 'Flight Instructor',
                        image: '',
                        imageAlt: 'Michael Chen',
                        bio: 'Enthusiastic instructor focused on building confidence and proficiency in student pilots from day one.',
                        certifications: 'CPL, CFI',
                        isActive: true,
                        order: 3,
                    },
                ],
            },
            statsSection: {
                isActive: true,
                stats: [
                    { value: '15+', label: 'Years Experience' },
                    { value: '500+', label: 'Students Trained' },
                    { value: '98%', label: 'Success Rate' },
                    { value: '24/7', label: 'Support Available' },
                ],
            },
            seo: {
                title: 'About Us | Personal Wings - Professional Aviation Training',
                description:
                    'Discover Personal Wings: professional flight training, aviation writing, and safety-focused education. Learn about our mission, values, and commitment to excellence in aviation training.',
                keywords: [
                    'about personal wings',
                    'aviation training company',
                    'flight school about',
                    'personal wings mission',
                    'aviation education',
                    'flight training history',
                ],
                ogTitle: 'About Us | Personal Wings',
                ogDescription:
                    'Learn about Personal Wings and our commitment to excellence in aviation training.',
                ogImage: '',
                canonicalUrl: 'https://personalwings.com/about-us',
            },
            isActive: true,
        };

        const createdAboutUs = new this.aboutUsModel(defaultAboutUs);
        await createdAboutUs.save();

        console.log('About Us page seeded successfully!');
    }
}
