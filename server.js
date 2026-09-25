// Meeting Summarizer backend
// Endpoints: POST /minutes, /decisions, /action-items, /email
// Each expects JSON body: { "notes": "raw meeting notes text" }

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.1-flash-lite'; // lighter model, less contention on free tier

function requireNotes(req, res) {
  const notes = (req.body && req.body.notes || '').trim();
  if (!notes) {
    res.status(400).json({ error: 'Missing "notes" in request body.' });
    return null;
  }
  return notes;
}

async function askGemini(prompt, { json = false } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1000 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini API error (${res.status})`);
  }
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || '')
    .join('\n')
    .trim();
  if (!json) return text;
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// 1. Minutes of meeting
app.post('/minutes', async (req, res) => {
  const notes = requireNotes(req, res);
  if (!notes) return;
  try {
    const minutes = await askGemini(
      `You write clean, professional minutes of meeting from raw notes. Write a short narrative summary (3-6 sentences or short paragraphs) covering what was discussed, in plain prose, no headers, no bullet preamble. Raw notes:\n\n${notes}`
    );
    res.json({ minutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate minutes.' });
  }
});

// 2. Decisions made
app.post('/decisions', async (req, res) => {
  const notes = requireNotes(req, res);
  if (!notes) return;
  try {
    const data = await askGemini(
      `From these raw meeting notes, extract every concrete decision that was made. Return ONLY JSON: {"decisions": ["decision text", ...]}. If none were made, return {"decisions": []}. Raw notes:\n\n${notes}`,
      { json: true }
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extract decisions.' });
  }
});

// 3. Follow-up / action items
app.post('/action-items', async (req, res) => {
  const notes = requireNotes(req, res);
  if (!notes) return;
  try {
    const data = await askGemini(
      `From these raw meeting notes, extract every follow-up / action item. Return ONLY JSON: {"items":[{"task":"...", "owner":"Unassigned if not stated", "due":"Not specified if not stated"}]}. Raw notes:\n\n${notes}`,
      { json: true }
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extract action items.' });
  }
});

// 4. Follow-up email draft
app.post('/email', async (req, res) => {
  const notes = requireNotes(req, res);
  if (!notes) return;
  try {
    const data = await askGemini(
      `From these raw meeting notes, draft a short, clear follow-up email summarizing decisions and action items, in a friendly professional tone. Return ONLY JSON: {"subject":"...", "body":"..."}. Body should use plain line breaks, no markdown. Raw notes:\n\n${notes}`,
      { json: true }
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to draft email.' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Meeting Summarizer backend running on port ${PORT}`));
