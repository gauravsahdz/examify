
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowRight, BookOpen, Edit, BarChart3, MessageSquare, LogIn, UserPlus, Zap, Target, Award, Users as UsersIcon, Star, CheckCircle, Loader2 } from 'lucide-react'; // Added Loader2
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import Image from 'next/image'; // Import Next Image
import { LandingHeader } from '@/components/LandingHeader'; // Import LandingHeader

// Animation variants
const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (i: number = 1) => ({ // Added default value for i
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
};

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: React.ElementType, title: string, description: string, delay: number }) => (
  <motion.div
    custom={delay}
    variants={itemVariants}
    className="h-full" // Ensure motion div takes full height for alignment
  >
    <Card className="text-left hover:shadow-lg transition-shadow duration-300 h-full border-border/80 flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="bg-primary/10 p-3 rounded-full">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
);

const StepCard = ({ number, title, description, delay }: { number: number, title: string, description: string, delay: number }) => (
    <motion.div
        custom={delay}
        variants={itemVariants}
        className="relative flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm border border-border/60 h-full"
    >
        <div className="absolute -top-5 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-md">
            {number}
        </div>
        <h3 className="mt-6 mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
);

const BenefitItem = ({ icon: Icon, text, delay }: { icon: React.ElementType, text: string, delay: number }) => (
     <motion.li
        custom={delay}
        variants={itemVariants}
        className="flex items-center gap-3"
      >
        <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
        <span className="text-muted-foreground">{text}</span>
     </motion.li>
);

const TestimonialCard = ({ name, role, text, delay }: { name: string, role: string, text: string, delay: number }) => (
   <motion.div
      custom={delay}
      variants={itemVariants}
      className="bg-card p-6 rounded-lg shadow-sm border border-border/60 text-center h-full flex flex-col justify-between"
   >
      <p className="text-muted-foreground italic mb-4">"{text}"</p>
      <div>
         <p className="font-semibold">{name}</p>
         <p className="text-xs text-muted-foreground">{role}</p>
      </div>
   </motion.div>
);

export default function HomePage() {
   const { user, loading, isAdmin } = useAuth(); // Get user status

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-background via-background to-secondary/10 overflow-x-hidden">
      <LandingHeader /> {/* Add Landing Header */}

      {/* Hero Section */}
      <motion.section
        className="w-full flex flex-col items-center justify-center pt-16 pb-20 px-4 text-center bg-gradient-to-br from-primary/5 via-background to-background" // Adjust padding
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <Card className="w-full max-w-4xl shadow-xl border-primary/10 overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="p-10 md:p-12">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
               {/* Logo placeholder */}
               <Zap className="w-12 h-12 text-primary mx-auto mb-4 animate-subtle-float" />
              <CardTitle className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary mb-4 tracking-tight">
                Examify: AI-Powered Assessments
              </CardTitle>
            </motion.div>
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <CardDescription className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Create, manage, and analyze tests seamlessly with the power of AI. Elevate your assessment experience.
              </CardDescription>
             </motion.div>
          </CardHeader>
          <CardContent className="pb-10 px-8">
            <motion.div
              className="flex flex-col sm:flex-row justify-center items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              {loading ? (
                 <Button size="lg" disabled><Loader2 className="mr-2 animate-spin"/> Loading...</Button>
               ) : user ? (
                 <>
                  {isAdmin && (
                     <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-primary-foreground">
                       <Link href="/admin/dashboard">
                         <Edit className="mr-2" /> Admin Dashboard
                       </Link>
                     </Button>
                   )}
                   {/* Link for Candidates - Use a more appropriate link */}
                   {!isAdmin && (
                      <Button asChild variant="outline" size="lg" className="shadow-sm hover:shadow-md transition-shadow border-primary/50 text-primary hover:bg-primary/10">
                         {/* Link to a general user area or a sample test */}
                         <Link href="/test/t1"> {/* Example: Sample Test */}
                            <BookOpen className="mr-2" /> Take a Sample Test
                         </Link>
                      </Button>
                   )}
                   {/* Generic Go to App button if needed, or remove if covered above */}
                    {/* <Button asChild variant="outline" size="lg" className="shadow-sm hover:shadow-md transition-shadow border-primary/50 text-primary hover:bg-primary/10">
                        <Link href={isAdmin ? "/admin/dashboard" : "/test/t1"}>
                            <ArrowRight className="mr-2" /> Go to App
                        </Link>
                    </Button> */}
                 </>
               ) : (
                 <>
                   {/* Show Sign In/Sign Up if not logged in */}
                   <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-primary-foreground">
                      <Link href="/auth/signin">
                       <LogIn className="mr-2" /> Sign In
                      </Link>
                   </Button>
                   <Button asChild variant="outline" size="lg" className="shadow-sm hover:shadow-md transition-shadow border-primary/50 text-primary hover:bg-primary/10">
                     <Link href="/auth/signup">
                        <UserPlus className="mr-2" /> Get Started Free
                     </Link>
                   </Button>
                 </>
               )}
             </motion.div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Features Section */}
      <motion.section
        id="features" // Ensure ID exists
        className="w-full max-w-6xl mt-20 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Powerful Features, Simplified
        </h2>
        <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionVariants}
        >
           <FeatureCard
             icon={Edit}
             title="Easy Test Creation"
             description="Build tests with various question types using an intuitive interface."
             delay={1}
           />
           <FeatureCard
             icon={BarChart3}
             title="AI Question Generation"
             description="Leverage AI to automatically generate relevant questions based on topics and difficulty."
             delay={2}
           />
           <FeatureCard
             icon={MessageSquare}
             title="AI Feedback Summary"
             description="Get concise AI-powered summaries of user feedback to quickly identify issues."
             delay={3}
           />
        </motion.div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section
        id="how-it-works" // Ensure ID exists
        className="w-full max-w-6xl mt-24 px-4 py-16 bg-primary/5 rounded-lg"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How Examify Works</h2>
        <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionVariants}
        >
           <StepCard number={1} title="Create/Generate" description="Build tests manually or let our AI generate questions based on your topic and difficulty." delay={1}/>
           <StepCard number={2} title="Configure & Assign" description="Set duration, enable proctoring features like webcam monitoring, and assign tests to candidates." delay={2}/>
           <StepCard number={3} title="Analyze & Review" description="Track submissions in real-time, view detailed results, and utilize AI summaries for feedback." delay={3}/>
        </motion.div>
      </motion.section>

      {/* For Whom Section */}
      <motion.section
        id="for-whom" // Added ID (optional, if needed)
        className="w-full max-w-6xl mt-24 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Perfect For...</h2>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
            <FeatureCard icon={UsersIcon} title="Educators & Institutions" description="Streamline quizzes, exams, and assignments with automated grading and insightful analytics." delay={1} />
            <FeatureCard icon={Target} title="Businesses & HR" description="Assess candidate skills, conduct employee training evaluations, and ensure compliance efficiently." delay={2} />
            <FeatureCard icon={Award} title="Certification Bodies" description="Deliver secure, standardized online exams with optional proctoring features." delay={3} />
        </motion.div>
      </motion.section>

      {/* Why Choose Us Section */}
       <motion.section
        id="why-choose-us" // Added ID (optional)
        className="w-full max-w-6xl mt-24 px-4 flex flex-col md:flex-row items-center gap-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="w-full md:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Choose Examify?</h2>
            <p className="text-muted-foreground mb-8">
                Examify combines cutting-edge AI with user-friendly design to provide a robust and reliable assessment solution. Focus on what matters most – evaluating knowledge and skills effectively.
            </p>
             <motion.ul
                className="space-y-4"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={sectionVariants}
            >
               <BenefitItem icon={Zap} text="AI-Powered Efficiency: Generate questions and summarize feedback instantly." delay={1}/>
               <BenefitItem icon={BookOpen} text="Flexible Question Types: Support for multiple-choice, short answer, and essays." delay={2}/>
               <BenefitItem icon={Edit} text="Intuitive Management: Easily create, edit, and organize tests and questions." delay={3}/>
               <BenefitItem icon={BarChart3} text="Insightful Analytics: Track performance and gain valuable insights from submissions." delay={4}/>
               {/* Add more benefits */}
             </motion.ul>
        </div>
         <motion.div
            className="w-full md:w-1/2 h-64 md:h-80 relative rounded-lg overflow-hidden shadow-lg"
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true, amount: 0.3 }}
             transition={{ duration: 0.6 }}
         >
            {/* Placeholder image - replace with relevant visual */}
            <Image src="https://picsum.photos/seed/examifyBenefit/600/400" alt="Examify Dashboard Preview" layout="fill" objectFit="cover" data-ai-hint="dashboard analytics chart screen"/>
         </motion.div>
      </motion.section>


      {/* Testimonials Section - Placeholder */}
      <motion.section
        id="testimonials" // Added ID (optional)
        className="w-full max-w-6xl mt-24 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Trusted by Leaders</h2>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
            <TestimonialCard name="Alex Johnson" role="HR Manager, TechCorp" text="Examify streamlined our candidate screening process significantly. The AI features are a huge time-saver!" delay={1}/>
            <TestimonialCard name="Dr. Emily Carter" role="Professor, University XYZ" text="Creating and grading exams used to take hours. Examify makes it incredibly efficient and provides great insights." delay={2}/>
            <TestimonialCard name="Sam Lee" role="Training Lead, Global Co." text="We use Examify for all our internal certifications. It's reliable, secure, and easy for our employees to use." delay={3}/>
        </motion.div>
      </motion.section>

      {/* Call to Action Section */}
      <motion.section
        id="cta" // Added ID (optional)
        className="w-full mt-24 py-20 px-4 bg-gradient-to-r from-primary to-blue-600 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
         <motion.h2
            className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4"
            initial={{ y: -10, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
         >Ready to Revolutionize Your Assessments?</motion.h2>
         <motion.p
            className="text-lg text-primary-foreground/90 max-w-2xl mx-auto mb-8"
            initial={{ y: -10, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
         >
            Join hundreds of educators and professionals using Examify to save time, improve accuracy, and gain deeper insights.
         </motion.p>
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
        >
            <Button asChild size="lg" variant="secondary" className="bg-background text-primary hover:bg-background/90 shadow-lg px-8 py-3 text-lg">
                <Link href={user ? (isAdmin ? '/admin/dashboard' : '/test/t1') : '/auth/signup'}>
                    Get Started Now <ArrowRight className="ml-2 h-5 w-5"/>
                </Link>
            </Button>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-muted-foreground border-t border-border/40">
        © {new Date().getFullYear()} Examify. All rights reserved.
      </footer>
    </div>
  );
}

    