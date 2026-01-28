import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Privacy Policy | LocalServices',
  description: 'Learn how LocalServices collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-500 mb-8">Last updated: December 2024</p>

            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                <p className="text-gray-600 mb-4">
                  LocalServices (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your
                  information when you use our platform.
                </p>
                <p className="text-gray-600">
                  By using LocalServices, you agree to the collection and use of information in
                  accordance with this policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

                <h3 className="text-lg font-medium text-gray-900 mb-2">Personal Information</h3>
                <p className="text-gray-600 mb-4">
                  We may collect personal information that you voluntarily provide, including:
                </p>
                <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                  <li>Name and contact information (email, phone number, address)</li>
                  <li>Account credentials (username and password)</li>
                  <li>Profile information (photo, bio, preferences)</li>
                  <li>Business information (for service providers)</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-900 mb-2">Automatically Collected Information</h3>
                <p className="text-gray-600 mb-4">
                  When you access our platform, we may automatically collect:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Device information (type, operating system, browser)</li>
                  <li>IP address and location data</li>
                  <li>Usage data (pages visited, features used, search queries)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-600 mb-4">
                  We use the collected information for various purposes:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>To provide and maintain our services</li>
                  <li>To process bookings and transactions</li>
                  <li>To communicate with you about your account and services</li>
                  <li>To personalize your experience and show relevant content</li>
                  <li>To improve our platform and develop new features</li>
                  <li>To detect and prevent fraud or abuse</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
                <p className="text-gray-600 mb-4">
                  We may share your information in the following situations:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><strong>With Service Providers:</strong> When you book a service, relevant information is shared with the business</li>
                  <li><strong>With Third-Party Services:</strong> For payment processing, analytics, and marketing</li>
                  <li><strong>For Legal Compliance:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  We do not sell your personal information to third parties.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
                <p className="text-gray-600 mb-4">
                  We implement appropriate security measures to protect your information, including:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication measures</li>
                  <li>Employee training on data protection</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  However, no method of transmission over the internet is 100% secure. We cannot
                  guarantee absolute security of your data.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
                <p className="text-gray-600 mb-4">
                  Depending on your location, you may have the following rights:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                  <li><strong>Deletion:</strong> Request deletion of your data</li>
                  <li><strong>Portability:</strong> Request transfer of your data</li>
                  <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  To exercise these rights, please contact us at privacy@localservices.com.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Cookies</h2>
                <p className="text-gray-600 mb-4">
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Keep you logged in</li>
                  <li>Remember your preferences</li>
                  <li>Analyze platform usage</li>
                  <li>Deliver relevant advertising</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  You can control cookies through your browser settings. Disabling cookies may
                  affect platform functionality.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Children&apos;s Privacy</h2>
                <p className="text-gray-600">
                  Our services are not intended for children under 13. We do not knowingly collect
                  personal information from children. If you believe we have collected information
                  from a child, please contact us immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
                <p className="text-gray-600">
                  We may update this Privacy Policy from time to time. We will notify you of
                  significant changes by posting a notice on our platform or sending you an email.
                  Your continued use of LocalServices after changes constitutes acceptance of the
                  updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
                <p className="text-gray-600 mb-4">
                  If you have questions about this Privacy Policy, please contact us:
                </p>
                <ul className="text-gray-600 space-y-1">
                  <li><strong>Email:</strong> privacy@localservices.com</li>
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
