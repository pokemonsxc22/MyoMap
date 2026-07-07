import { useLocation } from "wouter";

export default function TermsOfService() {
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

        <h1 className="text-3xl font-extrabold mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: June 2025</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using MyoMap ("the Service"), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. Description of Service</h2>
            <p>
              MyoMap is an AI-powered mobility coaching platform that provides personalized corrective
              exercise routines based on user-reported pain locations and movement assessments. The
              Service uses artificial intelligence to generate exercise recommendations and provide
              general mobility guidance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Not Medical Advice</h2>
            <p>
              <strong className="text-white">The Service does not constitute medical advice.</strong>{" "}
              MyoMap is designed for general wellness and fitness purposes only. The exercise
              recommendations provided are not a substitute for professional medical advice, diagnosis,
              or treatment. Always consult a qualified healthcare provider before starting any new
              exercise program, especially if you have a pre-existing medical condition, injury, or
              chronic pain.
            </p>
            <p className="mt-3">
              If you experience severe pain, numbness, or other concerning symptoms, stop exercising
              immediately and seek professional medical attention.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. User Accounts</h2>
            <p>
              You are responsible for maintaining the security of your account credentials. You agree
              to provide accurate information when creating an account and to notify us immediately of
              any unauthorized access. You must be at least 18 years old to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to reverse-engineer, scrape, or copy the Service's AI models or content</li>
              <li>Share your account with others or create multiple accounts</li>
              <li>Submit false or misleading health information</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">6. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service — including but not limited to
              exercise routines, AI-generated recommendations, text, graphics, and software — are
              owned by MyoMap and are protected by applicable intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">7. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without any warranties of any kind,
              express or implied. We do not warrant that the Service will be uninterrupted, error-free,
              or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, MyoMap shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service,
              including any physical injury resulting from following exercise recommendations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">9. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Service after changes
              constitutes acceptance of the new Terms. We will notify users of material changes via
              the email associated with your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">10. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:support@myomap.app" className="text-teal-400 hover:underline">
                support@myomap.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
