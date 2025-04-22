import Link from "next/link";
import React from "react";
import { ArrowUpRight, Check } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-teal-100 opacity-70" />
      <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-8 tracking-tight">
              <span className="text-gray-900">Close</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">
                More Deals
              </span>
              . Cut Your Workload in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">
                Half
              </span>
              . Instantly{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">
                Match Clients
              </span>{" "}
              with the Right Insurance Plan Without the Headaches.
            </h1>

            <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed flex">
              Finally… an AI-powered sales system designed to help brokers close
              faster, convert more, and eliminate guesswork from underwriting
              and sales calls.
            </p>

            <p className="text-sm text-gray-500 mb-12 max-w-2xl mx-auto"> </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors text-lg font-medium"
              >
                Get Started Today
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Link>

              <Link
                href="#pricing"
                className="inline-flex items-center px-8 py-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-lg font-medium"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
