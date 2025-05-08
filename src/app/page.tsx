import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import PricingCard from "@/components/pricing-card";
import Footer from "@/components/footer";
import FeaturesSection from "@/components/landing/FeaturesSection";
import { createClient } from "../app/supabase/server";
import {
  ArrowUpRight,
  CheckCircle2,
  BrainCircuit,
  ClipboardCheck,
  LineChart,
  MessageSquareText,
} from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: plans, error } = await supabase.functions.invoke(
    "supabase-functions-get-plans",
  );

  console.log("Plans from API:", plans);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-teal-50">
      <Navbar />
      <Hero />
      {/* Features Section */}
      <FeaturesSection />

      {/* Stats Section */}
      <section className="py-20 bg-teal-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">35%</div>
              <div className="text-teal-100">Increase in Client Conversion</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-teal-100">Insurance Brokers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15min</div>
              <div className="text-teal-100">Average Time Saved Per Client</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              How Insurance Sales Genie Helps You Win More Deals (Without the
              Headaches)
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Forget the guesswork, the back-and-forth emails, and the
              underwriting rabbit holes. Here's how our system makes your sales
              process faster, easier, and way more profitable:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-teal-600 text-xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Effortless Client Intake
              </h3>
              <p className="text-gray-600">
                Easily gather client details and health info through our smart,
                step-by-step intake form so you know exactly what products your
                client qualifies for, right from the start.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-teal-600 text-xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Instant AI-Powered Plan Matching
              </h3>
              <p className="text-gray-600">
                Stop sifting through endless plan options. Our AI instantly
                matches your clients with the best-fit products based on their
                unique needs with clear, easy-to-understand explanations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-teal-600 text-xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Close More Deals, Confidently
              </h3>
              <p className="text-gray-600">
                Use real-time insights, sales call feedback, and product
                recommendations to guide conversations, answer questions on the
                spot, and seal the deal faster than ever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gray-50" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get all these powerful AI tools for less than the cost of one
              missed deal per month. One saved sale covers your subscription 10X
              over.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans?.map((item: any) => (
              <PricingCard key={item.id} item={item} user={user} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              What Insurance Brokers Say
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Hear from brokers who have transformed their business with our
              platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-teal-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold">Sarah Johnson</h4>
                  <p className="text-sm text-gray-500">
                    Independent Health Insurance Broker
                  </p>
                </div>
              </div>
              <p className="text-gray-600">
                "The client matching system has revolutionized my practice. I'm
                able to find the right plans for clients in minutes instead of
                hours."
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-teal-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold">Michael Rodriguez</h4>
                  <p className="text-sm text-gray-500">Agency Owner</p>
                </div>
              </div>
              <p className="text-gray-600">
                "The AI chatbot has become my secret weapon. It helps me answer
                client questions instantly and with confidence."
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-teal-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold">Jennifer Lee</h4>
                  <p className="text-sm text-gray-500">
                    Life Insurance Specialist
                  </p>
                </div>
              </div>
              <p className="text-gray-600">
                "The sales call analyzer has helped me identify patterns in my
                conversations and dramatically improved my closing rate."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-teal-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Insurance Business?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of insurance brokers who are growing their business
            with our AI-powered platform.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Get Started Now
            <ArrowUpRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}
