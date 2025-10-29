
'use client';

import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle, BarChart, Users, Zap } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary/10 text-primary p-3 rounded-full">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">{title}</h3>
        </div>
        <p className="text-muted-foreground">{description}</p>
    </div>
);


export default function LandingPage() {
    return (
        <PublicLayout>
            <div className="w-full">
                {/* Hero Section */}
                <section className="text-center py-20 lg:py-32">
                    <div className="container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-bold font-headline mb-4 tracking-tight">
                            Streamline Your Social Media
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                            Social Streamliner helps you manage, schedule, and analyze your social media presence across platforms with powerful, easy-to-use tools.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button asChild size="lg">
                                <Link href="/login">
                                    Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Image Showcase */}
                 <section className="container mx-auto px-4 mb-20 lg:mb-32">
                    <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-2xl border-8 border-card">
                         <Image
                            src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                            alt="Dashboard preview"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 80vw"
                            data-ai-hint="team collaboration"
                        />
                    </div>
                </section>


                {/* Features Section */}
                <section className="py-20 lg:py-24 bg-muted/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">Powerful Features, Simple Interface</h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
                                Everything you need to grow your audience and save time.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FeatureCard 
                                icon={Zap}
                                title="Automated Posting"
                                description="Schedule posts for Instagram and Facebook. Set your content calendar and let us handle the rest, ensuring you never miss a beat."
                            />
                            <FeatureCard 
                                icon={BarChart}
                                title="Deep Analytics"
                                description="Track your performance with detailed analytics. Understand your audience, see what's working, and optimize your strategy."
                            />
                             <FeatureCard 
                                icon={Users}
                                title="Unified Inbox"
                                description="Manage comments from all your connected accounts in one place. Engage with your community faster and more efficiently."
                            />
                        </div>
                    </div>
                </section>
                
                 {/* Final CTA Section */}
                <section className="py-20 lg:py-32">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                            Ready to Take Control?
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                           Join today and start streamlining your social media workflow.
                        </p>
                        <Button asChild size="lg">
                            <Link href="/login">
                                Sign Up Now
                            </Link>
                        </Button>
                    </div>
                </section>

                 {/* Footer */}
                <footer className="border-t">
                    <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
                        &copy; {new Date().getFullYear()} Social Streamliner. All Rights Reserved.
                    </div>
                </footer>

            </div>
        </PublicLayout>
    );
}
