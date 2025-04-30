import { ClipboardCheck, BrainCircuit, MessageSquareText } from "lucide-react";
import Image from "next/image";

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Intelligent Tools for Insurance Brokers
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            If you're like most brokers, you've wasted hours stuck on hold,
            waiting for underwriting answers. Or worse… lost deals because of
            avoidable mistakes. We built Insurance Sales Genie because we lived
            it too and we knew there had to be a smarter way. Create by brokers
            for brokers.
          </p>
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client Intake & Matching */}
          <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-teal-100">
            <div className="text-teal-600 mb-4">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Client Intake & Matching
            </h3>
            <p className="text-gray-600 mb-4">
              Multi-step form with health condition filtering that instantly
              displays qualifying insurance plans in a sortable table format.
              Plug in your client's info and get the best-matching plans
              perfectly filtered and explained in plain English.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <Image
                src="https://storage.googleapis.com/msgsndr/QFjnAi2H2A9Cpxi7l0ri/media/6807c1bec682235d3bfad7c2.png"
                alt="Client Intake & Matching Tool"
                width={600}
                height={400}
                className="w-full object-cover"
              />
            </div>
          </div>

          {/* Sales Call Analyzer */}
          <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-teal-100">
            <div className="text-teal-600 mb-4">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sales Call Analyzer</h3>
            <p className="text-gray-600 mb-4">
              Upload call recordings to receive AI-powered feedback highlighting
              strengths and improvement areas. Pinpoint exactly what's costing
              you sales and get clear, actionable coaching on how to fix it
              fast.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <Image
                src="https://storage.googleapis.com/msgsndr/QFjnAi2H2A9Cpxi7l0ri/media/6807c1be81c3b078030d5433.png"
                alt="Sales Call Analyzer"
                width={600}
                height={400}
                className="w-full object-cover"
              />
            </div>
          </div>

          {/* AI Chatbot Assistant */}
          <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-teal-100">
            <div className="text-teal-600 mb-4">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Chatbot Assistant</h3>
            <p className="text-gray-600 mb-4">
              Get real-time product information and client-specific
              recommendations through our intuitive chat interface. Get instant
              underwriting answers. No more hold times, callbacks, or waiting on
              carriers.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <Image
                src="https://storage.googleapis.com/msgsndr/QFjnAi2H2A9Cpxi7l0ri/media/6807c1be2ffc4506e853ca11.png"
                alt="AI Chatbot Assistant"
                width={600}
                height={400}
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
