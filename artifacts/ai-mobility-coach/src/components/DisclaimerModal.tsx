const DISCLAIMER_KEY = "disclaimer_acknowledged";

export function useDisclaimerAcknowledged() {
  return localStorage.getItem(DISCLAIMER_KEY) === "true";
}

export default function DisclaimerModal({ onAcknowledge }: { onAcknowledge: () => void }) {
  function handleClick() {
    localStorage.setItem(DISCLAIMER_KEY, "true");
    onAcknowledge();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f1f2e] border border-white/10 rounded-2xl max-w-md w-full p-8 shadow-2xl">
        <h2 className="text-white text-xl font-semibold mb-6">Medical Disclaimer</h2>
        <ul className="space-y-3 mb-8">
          {[
            "MyoMap provides general wellness information only, not medical advice.",
            "You should consult a licensed physician before starting any new exercise routine.",
            "Use of this platform is entirely at your own risk.",
            "MyoMap is not responsible for any injury resulting from use of this content.",
          ].map((statement) => (
            <li key={statement} className="flex gap-3 text-white/80 text-sm leading-relaxed">
              <span className="mt-1 shrink-0 text-[#00e5b0]">•</span>
              {statement}
            </li>
          ))}
        </ul>
        <button
          onClick={handleClick}
          className="w-full bg-[#00e5b0] hover:bg-[#00c99b] text-[#0a1628] font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          I Understand, Continue
        </button>
      </div>
    </div>
  );
}
