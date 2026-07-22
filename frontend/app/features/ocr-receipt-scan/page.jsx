import FeaturePageLayout from "@/components/FeaturePageLayout";

const useCase = {
  heading: "Skip the typing, keep the accuracy",
  paragraphs: [
    "Typing out a grocery run or a group dinner line by line is where most expense apps lose people. The receipt gets stuffed in a pocket and the expense never gets logged.",
    "Point your camera at any bill, or import a PDF, and the scanner reads the total, tax, and individual line items on its own - down to itemized entries you can split unevenly when one person ordered the expensive cocktail.",
    "It's built for real, crumpled, slightly-blurry receipts, not just clean digital invoices - so it holds up on an actual trip, not just in a demo.",
  ],
};

const steps = [
  { title: "Snap or import", desc: "Photograph a receipt or import a PDF bill straight into a group expense." },
  { title: "AI reads every line", desc: "Total, tax, and individual items are extracted automatically, no manual entry." },
  { title: "Split however it's fair", desc: "Assign items to specific people, or split the whole bill evenly, in a couple of taps." },
];

export default function OcrReceiptScanPage() {
  return (
    <FeaturePageLayout
      tag="AI OCR PARSER"
      tagColor="text-emerald-400"
      glowBg="bg-emerald-500/10"
      borderHover="hover:border-emerald-500/25"
      title="OCR Receipt Scan"
      description="Point your camera at any bill or import a PDF. SplitEase reads the total, tax, and line items instantly, so nobody has to type a receipt in by hand."
      image="/ocr_recept.webp"
      imageAlt="SplitEase OCR receipt scanner extracting line items from a bill"
      useCase={useCase}
      points={[
        "Item-by-item split allocation",
        "Smart total and tax identification",
        "Automatic item categorization",
      ]}
      steps={steps}
      currentHref="/features/ocr-receipt-scan"
    />
  );
}
