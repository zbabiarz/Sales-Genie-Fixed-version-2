import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          {/* Product Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#features"
                  className="text-gray-600 hover:text-teal-600"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-gray-600 hover:text-teal-600"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Solutions</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-teal-600">
                  Health Insurance
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-teal-600">
                  Life Insurance
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-teal-600">
                  Group Benefits
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-teal-600">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-teal-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center pt-8 border-t border-gray-200">
          <div className="text-gray-600">
            © {currentYear} Insurance Sales Genie. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
