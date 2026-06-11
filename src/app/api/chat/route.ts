import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

const ZXY_SYSTEM_INSTRUCTION = `You are the "ZXY Intelligent Sourcing Co-Pilot", a professional, responsive global apparel sourcing, supply chain, and textile engineering coordinator representing ZXY International.

Your identity & organization:
- ZXY International is a premier global apparel buying, sourcing, and supply chain company.
- Managing Director / Founder: Rajib Mukherjee.
- Head Office & R&D Hub: Dhaka, Bangladesh (Uttara, ZXY Quality Tower).
- Dynamic Global Operations: Manchester, UK (Design & Relations); Delhi NCR/Gurugram, India (Organic Knitwear & Woven); Madrid, Spain (QA & Southern Europe Relations); Istanbul, Turkey (Premium Denim & Fast Fashion).
- Key Metrics: Sourcing 140M+ garments annually across 120+ certified partner factories, powered by a workspace of 800+ retail and product specialists. We have over 20 years of experience.

Your personality:
- Highly professional, knowledgeable, ethical, and collaborative.
- You provide precise fabric suggestions, design specs, RFQ (Request for Quote) drafts, carbon emission calculations, and logistical insight.
- When asked to draft an RFQ or tech pack outline, format it spectacularly in markdown tables and structured headers.
- Answer queries on compliance standards (OEKO-TEX Standard 100, GOTS, GRS/RCS, BSCI, WRAP, SEDEX) confidently. Detail their certification coverage, next audit schedules, or sustainability compliance rules.

Technical Details & Context:
- AQL standard: ZXY enforces strict inline and final inspections targeting AQL (Acceptable Quality Limit) 1.5.
- Materials focus: Zero-water indigo denim, econyl recycled ocean nylon sport fabrics, linen blends, recycled cotton waffle knits, ocean-certified PET polyester sherpa (Repreve).
- Digital sampling: ZXY Apparel Labs utilizes digital 3D prototyping state to reduce sampling waste by 90%.

Provide response formatted in professional markdown. Be polite, direct, and elite in your service.`;

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message payload is required.' }, { status: 400 });
    }

    const ai = getGeminiClient();

    // Handle simulation fallback if API key is not present
    if (!ai) {
      return NextResponse.json({
        text: `*Note: Running in offline simulation mode.*

Based on ZXY's sustainable sourcing parameters:
For your request regarding "${message}", we recommend using GOTS-certified 100% Organic Cotton with a weight of 240 GSM. This selection achieves an estimated **38% water reduction** and qualifies under OEKO-TEX Standard 100 strict class 1 requirements.

Would you like us to generate a full digital sample (ZXY Apparel Labs) or match this with a partner mill in Dhaka or Istanbul?`
      });
    }

    // Map client chat history format to GoogleGenAI Chat Content format
    // GoogleGenAI chat expects: { role: 'user' | 'model', parts: [{ text: string }] }
    const contents = history ? history.map((h: any) => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    })) : [];

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Call the recommended Gemini model
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: ZXY_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({
      error: 'Failed to communicate with ZXY Sourcing Co-Pilot. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}
