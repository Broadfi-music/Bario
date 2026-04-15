import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-medium">Terms of Service</span>
          <div className="w-5" />
        </div>
      </div>

      <div className="pt-16 pb-12 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mt-8 mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: April 15, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Bario application and website at bario.icu (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. We reserve the right to update these Terms at any time, and continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>
              Bario is a social audio platform that enables users to host and join live audio rooms (Spaces), discover music, participate in audio battles, send virtual gifts, and engage with creators. The Service includes features such as AI-powered music remixing, real-time audio streaming, direct messaging, creator profiles, and a virtual coin economy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Account Registration</h2>
            <p className="mb-2">To use certain features of the Service, you must create an account. When creating an account, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activity that occurs under your account</li>
            </ul>
            <p className="mt-2">You may sign in using email/password or through third-party providers (Google, Apple). You must be at least 13 years of age to create an account.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. User Conduct</h2>
            <p className="mb-2">When using the Service, you agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Post, stream, or transmit content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
              <li>Impersonate any person or entity, or falsely represent your affiliation</li>
              <li>Use the Service to distribute spam, malware, or unsolicited commercial content</li>
              <li>Attempt to gain unauthorized access to other users' accounts or our systems</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              <li>Use automated tools, bots, or scripts to access or interact with the Service</li>
              <li>Violate any applicable local, state, national, or international law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Live Audio Spaces</h2>
            <p>
              Bario allows users to host and participate in live audio rooms. Hosts are responsible for moderating their rooms and may remove or ban participants who violate these Terms or community standards. Audio transmitted during live sessions is streamed in real-time and is not recorded unless the host explicitly enables recording. Recorded sessions may be saved as podcast episodes and made publicly available on the host's profile.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Virtual Currency and Gifts</h2>
            <p className="mb-2">
              The Service includes a virtual coin system that allows users to purchase coins and send gifts to creators during live sessions.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Coins are purchased with real currency through our payment provider (Paystack) and are non-refundable</li>
              <li>Coins have no real-world monetary value outside the Service</li>
              <li>Gifts sent to creators are converted to earnings that may be withdrawn subject to our minimum withdrawal threshold</li>
              <li>We reserve the right to modify coin pricing, gift values, and withdrawal terms at any time</li>
              <li>Fraudulent purchases or gift manipulation will result in account suspension</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Content and Intellectual Property</h2>
            <p className="mb-2">
              You retain ownership of content you create and upload to the Service, including audio recordings, remixes, posts, and profile information. By posting content, you grant Bario a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content within the Service.
            </p>
            <p>
              You represent that you have all necessary rights to any content you upload. You must not upload copyrighted music or audio that you do not have permission to use. Music discovery features powered by third-party APIs (Deezer, Last.fm, Audius) are provided for preview purposes only and are subject to the respective platforms' terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. AI Remix Feature</h2>
            <p>
              The AI Remix feature allows users to generate remixed versions of audio using artificial intelligence. You are responsible for ensuring you have the rights to any source audio used for remixing. AI-generated remixes are provided "as is" and Bario makes no guarantees about their quality, originality, or fitness for any particular purpose. Remixes created through the Service may be published to your profile and shared with the community.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Battles</h2>
            <p>
              Audio battles are competitive live sessions between two creators. By participating in a battle, you agree to the battle rules, including the scoring system and time limits. Battle results are determined by audience engagement and are final. Unsportsmanlike conduct during battles may result in disqualification or account restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Subscription Plans</h2>
            <p>
              Bario offers free and paid subscription tiers (Basic at $5/month and Pro at $12/month). Paid subscriptions are billed monthly and may be cancelled at any time. Features available under each tier are subject to change. Refunds for subscription payments are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine violates these Terms, is harmful to other users, or is otherwise objectionable. Upon termination, your right to use the Service immediately ceases. Any remaining coin balance or pending creator earnings may be forfeited upon termination for cause.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">12. Disclaimers</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free. We are not responsible for any content created or shared by users, including audio streamed during live sessions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">13. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Bario shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">15. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at <a href="mailto:support@bario.icu" className="text-foreground underline">support@bario.icu</a>.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex justify-center gap-4 text-sm">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span className="text-border">•</span>
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Bario
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
