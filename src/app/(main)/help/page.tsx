import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Help Center | LocalServices',
  description: 'Get help with using LocalServices. Find answers to common questions and learn how to make the most of our platform.',
};

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click the "Sign Up" button in the top right corner. You can register as a consumer to find services, or as a business owner to list your services.',
      },
      {
        q: 'Is LocalServices free to use?',
        a: 'Yes, browsing and searching for services is completely free for consumers. Business owners can list their services with various subscription plans.',
      },
      {
        q: 'How do I search for a service?',
        a: 'Use the search bar at the top of the page or browse by category. You can filter results by location, rating, and price range.',
      },
    ],
  },
  {
    category: 'Bookings',
    questions: [
      {
        q: 'How do I book a service?',
        a: 'Find a service provider you like, click on their profile, and use the booking form to request an appointment. The business will confirm your booking.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'Yes, you can cancel a booking from your "My Bookings" page. Please check the business\'s cancellation policy for any applicable fees.',
      },
      {
        q: 'How do I reschedule a booking?',
        a: 'Contact the service provider directly through their profile page or cancel and create a new booking with your preferred time.',
      },
    ],
  },
  {
    category: 'For Business Owners',
    questions: [
      {
        q: 'How do I list my business?',
        a: 'Register as a business owner, then complete your business profile with services, hours, and photos. Your listing will be visible once approved.',
      },
      {
        q: 'How do I manage bookings?',
        a: 'Access your Business Dashboard to view, confirm, or decline booking requests. You\'ll receive notifications for new bookings.',
      },
      {
        q: 'How can I get more visibility?',
        a: 'Keep your profile complete and up-to-date, respond quickly to inquiries, and encourage satisfied customers to leave reviews.',
      },
    ],
  },
  {
    category: 'Account & Security',
    questions: [
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page and enter your email. You\'ll receive instructions to reset your password.',
      },
      {
        q: 'How do I update my profile?',
        a: 'Log in and go to your account settings to update your personal information, contact details, and preferences.',
      },
      {
        q: 'Is my information secure?',
        a: 'Yes, we use industry-standard encryption to protect your data. See our Privacy Policy for more details.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
            <p className="text-gray-600 mt-2">
              Find answers to common questions and learn how to use LocalServices
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Need more help?</h2>
            <p className="text-gray-600 mb-4">
              Can&apos;t find what you&apos;re looking for? Our support team is here to help.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </Link>
          </div>

          <div className="space-y-8">
            {faqs.map((section) => (
              <div key={section.category} className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.category}</h2>
                <div className="space-y-4">
                  {section.questions.map((item, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <h3 className="font-medium text-gray-900 mb-2">{item.q}</h3>
                      <p className="text-gray-600 text-sm">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Still have questions?</h2>
            <p className="text-gray-600 mb-4">
              Our team is available Monday to Friday, 9am to 6pm.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/contact"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Contact Us
              </Link>
              <Link
                href="/categories"
                className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Browse Services
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
