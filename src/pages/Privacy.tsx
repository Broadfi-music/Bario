import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-medium">Privacy Policy</span>
          <div className="w-5" />
        </div>
      </div>

      <div className="pt-16 pb-12 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mt-8 mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: April 15, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              Bario ("we", "our", or "us") operates the Bario mobile application and website at bario.icu (the "Service"). This Privacy Policy explains how we collect, use, and protect your information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Account Information:</strong> Email address, display name, and profile picture when you create an account.</li>
              <li><strong>Authentication Data:</strong> Sign-in credentials via email/password or third-party OAuth providers (Google, Apple).</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our Service, including listening activity, room participation, and engagement metrics.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers for push notifications.</li>
              <li><strong>Audio Data:</strong> Audio streams during live sessions are transmitted in real-time but are not stored unless recording is explicitly enabled by the host.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>To provide and maintain the Service</li>
              <li>To manage your account and enable social features</li>
              <li>To send push notifications about live spaces and activity</li>
              <li>To process virtual gift transactions and coin purchases</li>
              <li>To improve and personalize your experience</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Data Sharing</h2>
            <p>
              We do not sell your personal information. We may share data with third-party service providers that help us operate the Service, including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li><strong>Authentication:</strong> Google and Apple for OAuth sign-in</li>
              <li><strong>Real-time Audio:</strong> Agora for live audio streaming</li>
              <li><strong>Payments:</strong> Paystack for processing coin purchases</li>
              <li><strong>Infrastructure:</strong> Cloud hosting and database services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit (TLS), row-level security policies on our database, and secure authentication token management. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Access, correct, or delete your personal data</li>
              <li>Opt out of push notifications via device settings</li>
              <li>Request a copy of your data</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Children's Privacy</h2>
            <p>
              Our Service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@bario.icu" className="text-foreground underline">privacy@bario.icu</a>.
            </p>
          </section>
        </div>

        <div className="mt-10 text-center">
          <Link to="/" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
            ← Back to Bario
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
