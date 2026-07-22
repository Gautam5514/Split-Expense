import FeaturePageLayout from "@/components/FeaturePageLayout";

const useCase = {
  heading: "Your balances and chats deserve better than a reused password",
  paragraphs: [
    "A group's expense history is genuinely sensitive - who owes what, who's short on cash this month, receipts with real spending habits attached. That's not something to protect with a password you also used on three other sites.",
    "SplitEase verifies every login with a one-time passcode sent to your email, instead of relying on a static password that can be guessed, reused, or leaked in someone else's breach.",
    "It also means there's nothing to forget - no password reset flow, no \"was it capital or lowercase,\" just a fresh code every time you sign in.",
  ],
};

const steps = [
  { title: "Enter your email", desc: "No password to create, remember, or reset - just the email you sign up with." },
  { title: "Get a one-time code", desc: "A fresh passcode is dispatched to your inbox the moment you request it." },
  { title: "Verify and you're in", desc: "Enter the code and you're securely signed in - no static credentials left lying around." },
];

export default function SecureLoginPage() {
  return (
    <FeaturePageLayout
      tag="OTP CHECKER"
      tagColor="text-emerald-500"
      glowBg="bg-emerald-500/10"
      borderHover="hover:border-emerald-500/25"
      title="Secure OTP Login"
      description="Every sign-in is verified with a one-time passcode dispatched to your email - no static password to create, forget, or leak."
      image="/secure_otp.webp"
      imageAlt="SplitEase one-time passcode login screen"
      useCase={useCase}
      points={[
        "Instant one-time code dispatch by email",
        "No password to create, remember, or reset",
        "Robust protection against credential reuse and leaks",
      ]}
      steps={steps}
      currentHref="/features/secure-login"
    />
  );
}
