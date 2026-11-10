# Fonts for generated PDFs

These fonts are embedded in the settlement-statement PDF (utils/settlementReport.js).

| File | Font | Used for |
|---|---|---|
| Inter-400/500/600/700.ttf | Inter (Rasmus Andersson) | All body text, numbers, ₹ |
| JosefinSans-700.ttf | Josefin Sans (Santiago Orozco) | The "SplitEase" wordmark, same as the website |
| NotoSansDevanagari-500/700.ttf | Noto Sans Devanagari (Google) | Names or text written in Hindi |

All three are licensed under the SIL Open Font License 1.1
(https://openfontlicense.org), which allows bundling and embedding them in documents.
The files come from the Fontsource npm packages (@fontsource/inter@4.5.15,
@fontsource/josefin-sans@4.5.11, @fontsource/noto-sans-devanagari@4.5.11).

The Fontsource packages ship WOFF files; they were unpacked to plain TrueType
(.ttf) once, because decompressing WOFF on every PDF made each render ~1-3 s slower.
