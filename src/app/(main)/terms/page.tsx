import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Terms of Service | LocalServices',
  description: 'Read the terms and conditions for using LocalServices platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-gray-500 mb-8">Last updated: December 2024</p>

            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-600 mb-4">
                  By accessing or using LocalServices (&quot;the Platform&quot;), you agree to be bound by
                  these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please
                  do not use our services.
                </p>
                <p className="text-gray-600">
                  We reserve the right to modify these Terms at any time. Continued use of the
                  Platform after changes constitutes acceptance of the modified Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                <p className="text-gray-600 mb-4">
                  LocalServices is an online platform that connects consumers with local service
                  providers. We provide:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>A directory of local businesses and service providers</li>
                  <li>Tools for searching and filtering services</li>
                  <li>Booking and appointment scheduling features</li>
                  <li>Review and rating systems</li>
                  <li>Communication tools between consumers and businesses</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>

                <h3 className="text-lg font-medium text-gray-900 mb-2">Registration</h3>
                <p className="text-gray-600 mb-4">
                  To access certain features, you must create an account. You agree to:
                </p>
                <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-900 mb-2">Account Types</h3>
                <p className="text-gray-600">
                  <strong>Consumer Accounts:</strong> For individuals seeking services.<br />
                  <strong>Business Accounts:</strong> For service providers listing their businesses.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. User Conduct</h2>
                <p className="text-gray-600 mb-4">
                  You agree not to:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Post false, misleading, or fraudulent content</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use automated tools to scrape or extract data</li>
                  <li>Interfere with the proper functioning of the Platform</li>
                  <li>Create multiple accounts for deceptive purposes</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Business Listings</h2>
                <p className="text-gray-600 mb-4">
                  Business owners who list services on our Platform agree to:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Provide accurate business information</li>
                  <li>Maintain valid licenses and insurance as required</li>
                  <li>Respond to inquiries and bookings in a timely manner</li>
                  <li>Honor confirmed appointments and quoted prices</li>
                  <li>Comply with all applicable consumer protection laws</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  We reserve the right to remove or suspend listings that violate these Terms
                  or receive excessive complaints.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Bookings and Payments</h2>

                <h3 className="text-lg font-medium text-gray-900 mb-2">Bookings</h3>
                <p className="text-gray-600 mb-4">
                  Bookings made through the Platform are agreements between consumers and service
                  providers. LocalServices facilitates these connections but is not a party to
                  the service agreement.
                </p>

                <h3 className="text-lg font-medium text-gray-900 mb-2">Payments</h3>
                <p className="text-gray-600 mb-4">
                  Payment terms are determined by individual service providers. When payments
                  are processed through our Platform:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Payments are processed securely through third-party providers</li>
                  <li>Refund policies are set by individual businesses</li>
                  <li>We may charge service fees as disclosed at checkout</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-900 mb-2">Cancellations</h3>
                <p className="text-gray-600">
                  Cancellation policies are set by individual service providers. Please review
                  each business&apos;s policy before booking.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Reviews and Ratings</h2>
                <p className="text-gray-600 mb-4">
                  Users may leave reviews for services they have received. Reviews must:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Be based on genuine experiences</li>
                  <li>Be honest and accurate</li>
                  <li>Not contain defamatory, obscene, or illegal content</li>
                  <li>Not be written in exchange for compensation</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  We reserve the right to remove reviews that violate these guidelines.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
                <p className="text-gray-600 mb-4">
                  The Platform and its content are protected by copyright, trademark, and other
                  intellectual property laws. You may not:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Copy, modify, or distribute our content without permission</li>
                  <li>Use our trademarks without authorization</li>
                  <li>Remove copyright or other proprietary notices</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  Content you submit remains yours, but you grant us a license to use it in
                  connection with our services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Disclaimers</h2>
                <p className="text-gray-600 mb-4">
                  <strong>THE PLATFORM IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.</strong>
                </p>
                <p className="text-gray-600 mb-4">
                  We do not guarantee:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>The quality, safety, or legality of services listed</li>
                  <li>The accuracy of business information or reviews</li>
                  <li>That service providers are licensed or qualified</li>
                  <li>Uninterrupted or error-free platform operation</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  Users are responsible for verifying the credentials and qualifications of
                  service providers before engaging their services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
                <p className="text-gray-600 mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOCALSERVICES SHALL NOT BE LIABLE FOR:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Indirect, incidental, or consequential damages</li>
                  <li>Loss of profits, data, or business opportunities</li>
                  <li>Damages arising from services provided by listed businesses</li>
                  <li>Actions or omissions of third parties</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  Our total liability shall not exceed the fees paid by you in the preceding
                  12 months.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
                <p className="text-gray-600">
                  You agree to indemnify and hold harmless LocalServices and its affiliates from
                  any claims, damages, or expenses arising from your use of the Platform,
                  violation of these Terms, or infringement of any rights.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Termination</h2>
                <p className="text-gray-600 mb-4">
                  We may suspend or terminate your account at any time for:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Violation of these Terms</li>
                  <li>Fraudulent or illegal activity</li>
                  <li>Extended inactivity</li>
                  <li>At our sole discretion with or without cause</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  You may delete your account at any time through account settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
                <p className="text-gray-600">
                  These Terms are governed by the laws of the State of California, USA. Any
                  disputes shall be resolved in the courts of San Francisco County, California.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Contact Us</h2>
                <p className="text-gray-600 mb-4">
                  If you have questions about these Terms, please contact us:
                </p>
                <ul className="text-gray-600 space-y-1">
                  <li><strong>Email:</strong> legal@localservices.com</li>
                  <li><strong>Address:</strong> 123 Business Street, Suite 100, San Francisco, CA 94102</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
