import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// --- Parse command-line arguments ---
function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

const filePath = getArg('--file');
const clientName = getArg('--client');
const interviewDate = getArg('--date');
const interviewerPm = getArg('--interviewer');

if (!filePath || !clientName || !interviewDate || !interviewerPm) {
  console.error(
    'Usage: node scripts/ingest.js --file transcripts/acme.txt --client "Acme Corp" --date 2026-01-15 --interviewer "Maya Chen"'
  );
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`Transcript file not found: ${filePath}`);
  process.exit(1);
}

const transcript = fs.readFileSync(filePath, 'utf-8');

// --- Set up clients ---
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function main() {
  console.log('Fetching feature taxonomy...');
  const { data: features, error: featuresError } = await supabase
    .from('features')
    .select('name, owner_pm');

  if (featuresError) {
    console.error('Failed to fetch features:', featuresError.message);
    process.exit(1);
  }

  const featureList = features.map((f) => f.name).join(', ');

  console.log('Sending transcript to Claude for decomposition...');
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `You are analyzing a customer discovery interview transcript. Break it into discrete insight snippets — individual moments where the customer raised a pain point, feature request, praise, confusion, or workaround.

Only use these exact feature names when tagging (pick the closest match; if nothing fits, use "General/Unclear"): ${featureList}

For each snippet, output an object with these exact fields:
- text_excerpt: a concise paraphrase of what was said (do not quote verbatim, summarize in your own words, 1-2 sentences)
- feature_tag: one of the feature names above
- type: one of "blocker", "feature request", "praise", "confusion", "workaround"
- sentiment: one of "positive", "neutral", "negative"

Respond with ONLY a raw JSON array of these objects. No markdown formatting, no code fences, no preamble or explanation — just the JSON array itself.

Transcript:
${transcript}`,
      },
    ],
  });

  const responseText = message.content[0].text.trim();
  let snippets;
  try {
    snippets = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse Claude response as JSON:');
    console.error(responseText);
    process.exit(1);
  }

  console.log(`Claude identified ${snippets.length} snippets. Writing to Supabase...`);

  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .insert({
      client_name: clientName,
      interview_date: interviewDate,
      interviewer_pm: interviewerPm,
      raw_transcript: transcript,
    })
    .select()
    .single();

  if (interviewError) {
    console.error('Failed to insert interview:', interviewError.message);
    process.exit(1);
  }

  const snippetRows = snippets.map((s) => ({
    interview_id: interview.id,
    text_excerpt: s.text_excerpt,
    feature_tag: s.feature_tag,
    type: s.type,
    sentiment: s.sentiment,
  }));

  const { error: snippetsError } = await supabase.from('snippets').insert(snippetRows);

  if (snippetsError) {
    console.error('Failed to insert snippets:', snippetsError.message);
    process.exit(1);
  }

  console.log(`\nDone. Interview "${clientName}" (${interviewDate}) ingested.`);
  console.log(`${snippetRows.length} snippets created:`);
  const byFeature = {};
  snippetRows.forEach((s) => {
    byFeature[s.feature_tag] = (byFeature[s.feature_tag] || 0) + 1;
  });
  Object.entries(byFeature).forEach(([feature, count]) => {
    console.log(`  - ${feature}: ${count}`);
  });
}

main();