import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      plugins: [
        react(),
        tailwindcss(),
        {
          name: 'gemini-ocr-server-endpoint',
          configureServer(server) {
            server.middlewares.use('/api/extract-documents', (req, res) => {
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Method not allowed' }));
                return;
              }

              const chunks: Buffer[] = [];
              req.on('data', (chunk) => {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              });

              req.on('end', async () => {
                try {
                  const rawBody = Buffer.concat(chunks).toString('utf-8');
                  const body = JSON.parse(rawBody);
                  const apiKey = geminiKey || process.env.GEMINI_API_KEY || '';

                  if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not available on server' }));
                    return;
                  }

                  const { GoogleGenAI } = await import('@google/genai');
                  const ai = new GoogleGenAI({ apiKey });

                  const parts: any[] = [];
                  if (body.files && Array.isArray(body.files)) {
                    for (const f of body.files) {
                      if (f && f.base64) {
                        parts.push({
                          inlineData: {
                            mimeType: f.mimeType || 'application/pdf',
                            data: f.base64
                          }
                        });
                      }
                    }
                  }

                  const extractionInstruction = body.prompt || `You are an expert shipping document OCR system for Pakistan & International Maritime Logistics.
Extract all international shipping fields from the attached documents (Bill of Lading, Commercial Invoice, Packing List, Goods Declaration) into valid JSON with these keys:
- shippingLine (e.g. "WAN HAI", "Maersk", "MSC", "COSCO", "CMA CGM")
- blNumber (Bill of Lading number)
- blDate (YYYY-MM-DD)
- vesselName
- voyageNo
- pol (Port of Loading)
- pod (Port of Discharge)
- placeOfDelivery
- freightTerms (e.g. "FREIGHT PREPAID" or "FREIGHT COLLECT")
- freeDays
- shipperName (Shipper / Exporter / Consignor)
- shipperAddress
- shipperCountry
- shipperContact
- shipperEmail
- consigneeName (Consignee / Importer)
- consigneeAddress
- consigneeContact
- consigneeEmail
- ntnNumber (Consignee NTN or Tax ID, e.g. A629270-8)
- notifyPartyName
- notifyPartyAddress
- shippingAgent (Shipping Agent references, e.g. "RIAZEDA (PVT) LTD")
- shippingAgentAddress
- shippingAgentPhone
- invoiceNo (Commercial Invoice number)
- invoiceDate (YYYY-MM-DD)
- invoiceValue (numeric number, e.g. 53256)
- invoiceCurrency (e.g. "USD", "EUR", "PKR")
- incoTerms (e.g. "CFR", "CIF", "FOB")
- itemName (e.g. "MICRO VELVET FABRIC")
- itemType (e.g. "Textile Fabric", "Machinery", "Chemicals")
- hsCode (e.g. "5801.3700")
- packagingType (e.g. "ROLLS", "BALES", "CARTONS")
- packageCount (number of packages, e.g. 225)
- totalWeight (Gross weight in KG, e.g. 13410)
- grossWeight (Gross weight in KG, e.g. 13410)
- netWeight (Net weight in KG, e.g. 12680)
- volumeCBM (Measurement in CBM, e.g. 68.0)
- containers: array of objects with { number, size, weight, sealNo }
- suggestedCategory (e.g. "Bonded Carrier", "Customs Clearance", "Ocean Freight Import")
- docCategoryDetected (e.g. "Bill of Lading (Wan Hai) & Commercial Invoice & Packing List")

Return ONLY valid JSON.`;

                  parts.push({ text: extractionInstruction });

                  const apiResponse = await ai.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: { parts },
                    config: {
                      responseMimeType: 'application/json'
                    }
                  });

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(apiResponse.text || '{}');
                } catch (err: any) {
                  console.error('Server OCR endpoint error:', err);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'OCR processing failed' }));
                }
              });
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        '__GEMINI_API_KEY__': JSON.stringify(geminiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
