

# Regenerated Investor Pitch Deck + One-Page Summary

## What We're Building

Two deliverables:

1. **Complete Investor Pitch Deck** (PPTX, ~18 slides) — merging the existing narrative with new additions: AI Remix feature slide, 3-year financial projections, and polished product screenshots wrapped in professional product-shot frames (not raw app screenshots).

2. **One-Page Investor Summary** (PDF) — a single page with the essential pitch for cold emails and quick shares.

---

## New Slides Added to the Deck

### AI Remix Feature Slide
- Positions AI Remix as a **technical moat** — not just a feature
- Shows the flow: Upload Song → Select Genre → AI Transforms → Download
- Highlights: "Cultural genre transformation" — keeps melody, changes cultural lens
- Supported genres listed as visual tags (Amapiano, Afrobeats, Trap, K-Pop, etc.)

### 3-Year Financial Projections Slide
- Year 1 (2026): 5K users, $8K MRR, focus on product-market fit
- Year 2 (2027): 50K users, $85K MRR, launch premium subscriptions + creator payouts
- Year 3 (2028): 250K users, $420K MRR, marketplace + brand partnerships
- Revenue streams: Premium subscriptions, coin purchases (30% platform fee), creator tools, brand deals

### Product Screenshots (4 key views)
Each screenshot will be wrapped in the **product-shot generator** (macOS window frame + gradient background) so they look polished and presentation-ready — not like raw browser screenshots:

1. **AI Remix Hero** — the "Remix any song you can imagine" landing
2. **Bario Music Dashboard** — trending tracks, live sessions, market events
3. **Live Spaces** — battles, live discussions, listener counts
4. **Dashboard alternate view** — genre filters, trending data

These will be embedded as base64 images directly into the PPTX slides.

---

## Full Slide Order (~18 slides)

1. Cover — "Bario: The Future of Music Discovery & Creation"
2. Problem
3. Solution
4. **Product Screenshots** (2 slides showing the 4 key views)
5. **AI Remix Feature** — Technical moat slide
6. How It Works — platform flow
7. Traction — "Small Numbers, Big Signal"
8. Engagement Metrics — per-user ratios vs industry benchmarks
9. Community Reach — 34K social pipeline
10. Monetization Proof — gifting funnel, coin transactions
11. **3-Year Financial Projections**
12. TAM / SAM / SOM
13. Competitive Landscape
14. Growth Strategy
15. Team / Vision
16. The Ask

## Design

- Dark theme (#0D0D0D background) matching Bario's brand
- Green accent (#22C55E) for highlights and key metrics
- Fonts: Georgia (headers) + Calibri (body) for readability
- Large text (36-44pt titles, 16-18pt body) with generous spacing
- Product shots with gradient frames (ocean/midnight preset)

## One-Page Investor Summary (PDF)

- Clean white PDF, single A4 page
- Sections: What is Bario | Traction | AI Remix Moat | Market Size | The Ask
- Key metrics in large callout numbers
- Contact info at bottom
- Built with ReportLab

## Technical Steps

1. Generate 4 product shots from the captured screenshots using the product-shot generator script
2. Build the PPTX with pptxgenjs, embedding product shots as base64
3. Build the one-page PDF with ReportLab
4. QA: Convert PPTX → PDF → images, inspect every slide
5. Fix any issues found
6. Deliver both files to `/mnt/documents/`

