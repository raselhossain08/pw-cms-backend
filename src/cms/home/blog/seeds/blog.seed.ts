import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../schemas/blog.schema';

@Injectable()
export class BlogSeeder {
  constructor(@InjectModel(Blog.name) private blogModel: Model<BlogDocument>) {}

  async seed() {
    // Delete existing data and reseed
    await this.blogModel.deleteMany({});
    console.log('Existing blog data deleted, reseeding...');

    const blogData = {
      title: 'Latest Aviation',
      subtitle: 'Blog Post',
      description: 'Stay updated with the latest aviation insights and news',
      isActive: true,
      blogs: [
        {
          title: 'Taxiway Delta Transition: Scenic San Diego Bay Tour Flight',
          excerpt:
            'Experience a unique scenic flight over San Diego Bay while navigating one of the most interesting airport approaches.',
          image:
            'https://personalwings.com/wp-content/uploads/2024/05/Taxiway-Delta-Transition-San-Diego-International-Airport-Overflight-canceled-400x250.webp',
          slug: 'taxiway-delta-transition-scenic-san-diego-bay-tour-flight',
          featured: true,
          content: `
                        <h2>An Unforgettable Flight Experience</h2>
                        <p>The Taxiway Delta Transition at San Diego International Airport (KSAN) offers one of the most spectacular scenic flights available to general aviation pilots. This unique route takes you right over the heart of San Diego Bay, offering breathtaking views of the city skyline, Coronado Bridge, and the Pacific coastline.</p>
                        
                        <h3>What Makes This Flight Special</h3>
                        <p>Unlike typical VFR routes that require you to stay well clear of Class B airspace, the Taxiway Delta Transition allows properly equipped aircraft to fly through San Diego's busy airspace at a relatively low altitude. You'll experience:</p>
                        <ul>
                            <li>Close-up views of downtown San Diego's skyline</li>
                            <li>A unique perspective of aircraft operations at KSAN</li>
                            <li>Views of the iconic Coronado Bridge and USS Midway Museum</li>
                            <li>San Diego Bay's beautiful waterfront and marinas</li>
                        </ul>

                        <h3>Requirements and Procedures</h3>
                        <p>To fly the Taxiway Delta Transition, pilots must:</p>
                        <ul>
                            <li>Have an operational Mode C transponder</li>
                            <li>Maintain communication with San Diego Approach</li>
                            <li>Follow specific altitude and routing requirements</li>
                            <li>Be prepared for possible denial due to traffic</li>
                        </ul>

                        <p>The transition typically takes you eastbound at 2,500 feet or westbound at 2,000 feet, depending on traffic flow and controller discretion. Timing is everything – early morning or late evening flights often have better approval rates.</p>

                        <h3>Planning Your Flight</h3>
                        <p>Before attempting this transition, thoroughly review the San Diego Terminal Area Chart and the specific procedures outlined in the Airport/Facility Directory. It's also wise to practice your radio communications, as you'll be interacting with one of the busier approach control facilities in Southern California.</p>

                        <p>Many pilots recommend flying this route with an experienced local pilot or CFI the first time to learn the nuances and best practices. The view is worth the planning!</p>
                    `,
          author: {
            name: 'Captain Sarah Mitchell',
            role: 'Senior Flight Instructor',
            avatar:
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
            bio: 'With over 15 years of experience flying in Southern California, Captain Mitchell specializes in coastal navigation and advanced airspace procedures.',
            socialLinks: {
              linkedin: 'https://linkedin.com/in/sarahmitchell',
              twitter: 'https://twitter.com/captainsarah',
              website: 'https://personalwings.com',
            },
          },
          publishedAt: new Date('2024-05-15'),
          readTime: '8 min read',
          category: 'Flight Training',
          tags: [
            'VFR Flying',
            'Scenic Flights',
            'San Diego',
            'Class B Airspace',
            'Navigation',
          ],
          views: 2450,
          likes: 187,
          commentsCount: 23,
        },
        {
          title: 'Pilot Mental Health Resources and Support',
          excerpt:
            'Essential mental health resources for aviation professionals. These resources are available 24/7 in the United States.',
          image:
            'https://personalwings.com/wp-content/uploads/2024/02/depressed-pilot-pexels-nathan-cowley-897817-400x250.webp',
          slug: 'pilot-mental-health-resources-and-support',
          featured: false,
          content: `
                        <h2>Breaking the Stigma: Mental Health in Aviation</h2>
                        <p>The aviation industry is making significant strides in addressing mental health concerns among pilots and aviation professionals. However, stigma and fear of career consequences still prevent many from seeking help when they need it most.</p>

                        <h3>Why Mental Health Matters in Aviation</h3>
                        <p>Flying requires peak cognitive performance, sound judgment, and emotional stability. Mental health challenges can affect these critical abilities, making it essential for pilots to maintain their psychological well-being alongside their physical health.</p>

                        <h3>Available Resources</h3>
                        
                        <h4>National Suicide Prevention Lifeline</h4>
                        <p><strong>Call: 988 (24/7)</strong></p>
                        <p>Free and confidential support for people in distress, prevention and crisis resources.</p>

                        <h4>SAMHSA's National Helpline</h4>
                        <p><strong>Call: 1-800-662-HELP (4357)</strong></p>
                        <p>Treatment referral and information service for individuals and families facing mental health and/or substance use disorders.</p>

                        <h4>Pilot Assistance Programs</h4>
                        <p>Many airlines and aviation organizations offer confidential Employee Assistance Programs (EAPs) that provide:</p>
                        <ul>
                            <li>Confidential counseling services</li>
                            <li>Substance abuse support</li>
                            <li>Financial and legal consultations</li>
                            <li>Work-life balance resources</li>
                        </ul>

                        <h3>FAA Medical Certification Concerns</h3>
                        <p>One of the biggest barriers to seeking mental health care is fear of losing medical certification. However:</p>
                        <ul>
                            <li>Many mental health conditions are treatable and compatible with flying</li>
                            <li>Early intervention often leads to better outcomes</li>
                            <li>The FAA has resources for navigating mental health treatment while maintaining certification</li>
                            <li>Aviation Medical Examiners (AMEs) can provide guidance on treatment paths</li>
                        </ul>

                        <h3>Creating a Culture of Support</h3>
                        <p>Aviation organizations are increasingly recognizing the importance of peer support programs, where pilots can confidentially discuss challenges with trained colleagues who understand the unique pressures of the profession.</p>

                        <p>Remember: seeking help is a sign of strength, not weakness. Your mental health is just as important as your physical health, and taking care of it makes you a safer, more effective pilot.</p>
                    `,
          author: {
            name: 'Dr. James Rodriguez',
            role: 'Aviation Psychologist',
            avatar:
              'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
            bio: 'Dr. Rodriguez specializes in aviation psychology and has worked with pilots and air traffic controllers for over 20 years.',
            socialLinks: {
              linkedin: 'https://linkedin.com/in/jamesrodriguez',
              website: 'https://personalwings.com',
            },
          },
          publishedAt: new Date('2024-02-20'),
          readTime: '6 min read',
          category: 'Pilot Wellness',
          tags: [
            'Mental Health',
            'Pilot Support',
            'Aviation Safety',
            'Wellness',
          ],
          views: 3120,
          likes: 245,
          commentsCount: 42,
        },
        {
          title: 'Airline Pilot Interview Tips',
          excerpt:
            'Expert advice for acing your airline pilot interview and landing your dream aviation job.',
          image:
            'https://personalwings.com/wp-content/uploads/2023/12/A320-Simulator-ATPJETS-400x250.webp',
          slug: 'airline-pilot-interview-tips-landing-your-dream-airline-job',
          featured: false,
          content: `
                        <h2>Preparing for Your Airline Interview</h2>
                        <p>Landing an airline pilot position is a significant milestone in any aviator's career. The interview process can be intensive, covering technical knowledge, situational judgment, and personality assessment. Here's how to prepare effectively.</p>

                        <h3>Before the Interview</h3>
                        
                        <h4>Research the Company</h4>
                        <p>Thoroughly research your prospective employer:</p>
                        <ul>
                            <li>Company history, fleet, and route structure</li>
                            <li>Recent news and financial performance</li>
                            <li>Company culture and values</li>
                            <li>Pilot contract details and work rules</li>
                        </ul>

                        <h4>Technical Preparation</h4>
                        <p>Review key aviation topics:</p>
                        <ul>
                            <li>FARs (especially Parts 91, 121, and 135)</li>
                            <li>Aircraft systems for your current and previous aircraft</li>
                            <li>Instrument approach procedures and charts</li>
                            <li>Weather theory and interpretation</li>
                            <li>Aerodynamics fundamentals</li>
                        </ul>

                        <h3>The Interview Day</h3>
                        
                        <h4>Dress Professionally</h4>
                        <p>Conservative business attire is standard. Think captain's uniform professional – this is your chance to look the part.</p>

                        <h4>Technical Interview</h4>
                        <p>Technical portions often include:</p>
                        <ul>
                            <li>Jeppesen chart interpretation</li>
                            <li>Weather scenario analysis</li>
                            <li>Systems knowledge questions</li>
                            <li>Regulations and procedures</li>
                        </ul>

                        <h4>HR Interview</h4>
                        <p>Prepare for behavioral questions using the STAR method (Situation, Task, Action, Result):</p>
                        <ul>
                            <li>Tell me about a time you made a mistake...</li>
                            <li>Describe a situation where you had a conflict with a crew member...</li>
                            <li>How do you handle stress or fatigue?</li>
                            <li>Why do you want to work for our airline?</li>
                        </ul>

                        <h3>Simulator Evaluation</h3>
                        <p>Many airlines include a simulator assessment:</p>
                        <ul>
                            <li>Demonstrate safe flying habits</li>
                            <li>Communicate clearly with your partner</li>
                            <li>Show good crew resource management</li>
                            <li>Don't be afraid to ask questions or admit limitations</li>
                        </ul>

                        <h3>Follow-Up</h3>
                        <p>Send a professional thank-you email within 24 hours, reiterating your interest in the position and appreciation for the opportunity to interview.</p>

                        <p>Remember: airlines are looking for professional, competent pilots who will be good colleagues and representatives of their company. Be yourself, be prepared, and let your passion for aviation shine through.</p>
                    `,
          author: {
            name: 'Captain Mike Thompson',
            role: 'Chief Pilot, Major Airline',
            avatar:
              'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
            bio: 'Captain Thompson has conducted over 500 pilot interviews and has been flying for major airlines for 25 years.',
            socialLinks: {
              linkedin: 'https://linkedin.com/in/mikethompson',
              website: 'https://personalwings.com',
            },
          },
          publishedAt: new Date('2023-12-10'),
          readTime: '10 min read',
          category: 'Career Development',
          tags: [
            'Career',
            'Airline Jobs',
            'Interview Tips',
            'Professional Development',
          ],
          views: 4580,
          likes: 312,
          commentsCount: 67,
        },
        {
          title: 'How to Become a Professional Pilot',
          excerpt:
            'Your complete guide to a career in aviation with various training approaches and pathways.',
          image:
            'https://personalwings.com/wp-content/uploads/2022/12/How-to-Become-a-Professional-Pilot-Female-Captain-400x250.jpeg',
          slug: 'how-to-become-a-professional-pilot',
          featured: false,
          content: `
                        <h2>Your Journey to the Flight Deck</h2>
                        <p>Becoming a professional pilot is an exciting and rewarding career path that requires dedication, training, and passion for aviation. This comprehensive guide outlines the steps, requirements, and options available to aspiring pilots.</p>

                        <h3>Training Pathways</h3>
                        
                        <h4>Part 61 Flight Training</h4>
                        <p>Pros:</p>
                        <ul>
                            <li>Flexible scheduling</li>
                            <li>Can be more cost-effective</li>
                            <li>Personalized training pace</li>
                            <li>Choose your instructors</li>
                        </ul>
                        <p>Cons:</p>
                        <ul>
                            <li>Typically takes longer</li>
                            <li>Less structured</li>
                            <li>May require more self-discipline</li>
                        </ul>

                        <h4>Part 141 Flight Schools</h4>
                        <p>Pros:</p>
                        <ul>
                            <li>FAA-approved structured curriculum</li>
                            <li>Reduced flight hour requirements</li>
                            <li>Faster completion</li>
                            <li>Better for VA benefits</li>
                        </ul>
                        <p>Cons:</p>
                        <ul>
                            <li>Less flexibility</li>
                            <li>Set schedules</li>
                            <li>Typically more expensive</li>
                        </ul>

                        <h4>University Aviation Programs</h4>
                        <p>Combining a degree with flight training offers:</p>
                        <ul>
                            <li>Academic credentials</li>
                            <li>Restricted ATP eligibility (1,000 hours vs. 1,500)</li>
                            <li>Networking opportunities</li>
                            <li>Well-rounded education</li>
                        </ul>

                        <h3>Certificate Progression</h3>
                        
                        <h4>Private Pilot Certificate</h4>
                        <p>Minimum 40 hours (typically 60-75 hours actual)</p>
                        <p>Cost: $10,000 - $15,000</p>
                        <p>Allows you to carry passengers, but not for compensation</p>

                        <h4>Instrument Rating</h4>
                        <p>Minimum 40 hours instrument time</p>
                        <p>Cost: $8,000 - $12,000</p>
                        <p>Essential for professional flying and flying in IMC conditions</p>

                        <h4>Commercial Pilot Certificate</h4>
                        <p>Minimum 250 hours total time</p>
                        <p>Cost: $30,000 - $40,000 (including hour building)</p>
                        <p>Allows you to be paid as a pilot</p>

                        <h4>Certified Flight Instructor (CFI)</h4>
                        <p>Cost: $5,000 - $8,000</p>
                        <p>Common first pilot job, allows building flight hours while teaching</p>

                        <h4>Multi-Engine Rating</h4>
                        <p>Cost: $5,000 - $8,000</p>
                        <p>Required for most professional flying positions</p>

                        <h4>Airline Transport Pilot (ATP)</h4>
                        <p>1,500 hours total time (or 1,000 with R-ATP)</p>
                        <p>Required for airline captain positions</p>

                        <h3>Building Flight Time</h3>
                        <p>Common time-building methods:</p>
                        <ul>
                            <li>Flight instructing (most common)</li>
                            <li>Banner towing</li>
                            <li>Pipeline patrol</li>
                            <li>Skydiving operations</li>
                            <li>Part 135 charter operations</li>
                            <li>Corporate flying</li>
                        </ul>

                        <h3>Medical Requirements</h3>
                        <p>All pilots need an FAA medical certificate:</p>
                        <ul>
                            <li>1st Class: Required for ATP operations</li>
                            <li>2nd Class: Required for commercial operations</li>
                            <li>3rd Class: Required for private pilot privileges</li>
                        </ul>

                        <h3>Total Investment</h3>
                        <p>Zero to hero (no experience to ATP):</p>
                        <ul>
                            <li>Part 61: $70,000 - $100,000 (including time building)</li>
                            <li>Part 141: $80,000 - $120,000</li>
                            <li>University program: $150,000 - $250,000 (including degree)</li>
                        </ul>

                        <h3>Timeline</h3>
                        <ul>
                            <li>Part 61: 2-3 years to first airline job</li>
                            <li>Part 141: 18-24 months to first airline job</li>
                            <li>University: 4 years (degree) + 1-2 years building time</li>
                        </ul>

                        <h3>Career Outlook</h3>
                        <p>The pilot career outlook remains strong with:</p>
                        <ul>
                            <li>Projected pilot shortage through 2030s</li>
                            <li>Competitive salaries at major airlines</li>
                            <li>Strong benefits and retirement packages</li>
                            <li>Growing demand in cargo operations</li>
                        </ul>

                        <p>The path to becoming a professional pilot requires significant time and financial investment, but for those passionate about aviation, it's a rewarding career with excellent long-term prospects.</p>
                    `,
          author: {
            name: 'Captain Emily Chen',
            role: 'Aviation Career Counselor',
            avatar:
              'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400',
            bio: 'Captain Chen helps aspiring pilots navigate their training and career paths. She has trained over 200 professional pilots.',
            socialLinks: {
              linkedin: 'https://linkedin.com/in/emilychen',
              twitter: 'https://twitter.com/captainchen',
              website: 'https://personalwings.com',
            },
          },
          publishedAt: new Date('2022-12-05'),
          readTime: '12 min read',
          category: 'Career Development',
          tags: [
            'Flight Training',
            'Career Path',
            'Pilot Certificates',
            'Aviation Education',
          ],
          views: 5890,
          likes: 421,
          commentsCount: 89,
        },
      ],
      seo: {
        title: 'Aviation Blog | Personal Wings Flight Training Insights',
        description:
          'Read the latest aviation news, pilot training tips, and industry insights from Personal Wings flight training experts.',
        keywords:
          'aviation blog, flight training articles, pilot resources, aviation news, flight instructor tips',
        ogImage: '',
      },
    };

    const blog = new this.blogModel(blogData);
    await blog.save();
    console.log('Blog data seeded successfully!');
  }
}
