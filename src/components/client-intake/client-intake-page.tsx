import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientForm } from "./client-form";

export function ClientIntakePage() {
  return (
    <div className="container mx-auto px-4 py-8 relative">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Client Intake & Insurance Match Tool
          </h1>
          <p className="text-muted-foreground">
            Enter client information to find matching insurance plans based on
            health conditions and other factors.
          </p>
        </div>

        <ClientForm />
      </div>

      {/* Temporary overlay to disable feature */}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
        <div className="text-center p-8">
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">
            This feature is coming soon!
          </h3>
          <p className="text-gray-600">
            We're working hard to bring you this amazing tool.
          </p>
        </div>
      </div>
    </div>
  );
}
