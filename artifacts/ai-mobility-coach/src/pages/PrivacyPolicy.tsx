import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back nav */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: June 2025</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-300">Account data</strong> — email address and
                password (stored securely via Supabase Auth)
              </li>
              <li>
                <strong className="text-slate-300">Health & fitness data</strong> — pain location,
                movement screen answers, exercise history, and daily mobility scores you submit
              </li>
              <li>
                <strong className="text-slate-300">Usage data</strong> — pages visited, features
                used, and AI chat messages sent
              </li>
              <li>
                <strong className="text-slate-300">Device data</strong> — browser type, operating
                system, and IP address for security and analytics
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Generate and personalize your exercise routines</li>
              <li>Power the AI chat assistant with relevant context about your history</li>
              <li>Track your progress and mobility scores over time</li>
              <li>Improve the accuracy and quality of our AI recommendations</li>
              <li>Send transactional emails (e.g., password reset, account confirmation)</li>
              <li>Maintain the security and integrity of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Data Storage & Security</h2>
            <p>
              Your data is stored in Supabase, a secure cloud database platform. We implement
              row-level security (RLS) policies ensuring that your data can only be accessed by you.
              Passwords are never stored in plain text. All data is transmitted over HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. AI & Third-Party Services</h2>
            <p>
              MyoMap uses Groq (AI inference) to generate exercise routines and process chat
              messages. When you interact with the AI, relevant portions of your health data and
              conversation history may be sent to Groq's API for processing. Groq does not use this
              data to train models. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account,
              your personal data will be permanently deleted within 30 days, except where we are
              legally required to retain it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Access a copy of the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a href="mailto:privacy@myomap.app" className="text-teal-400 hover:underline">
                privacy@myomap.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">7. Cookies</h2>
            <p>
              We use session cookies solely for authentication purposes. We do not use tracking
              cookies or third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">8. Children's Privacy</h2>
            <p>
              The Service is not intended for users under 18 years of age. We do not knowingly
              collect data from minors. If you believe a minor has provided us with personal
              information, contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes via email. Continued use of the Service after changes take effect constitutes
              your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">10. Contact</h2>
            <p>
              For privacy-related questions, email{" "}
              <a href="mailto:privacy@myomap.app" className="text-teal-400 hover:underline">
                privacy@myomap.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
