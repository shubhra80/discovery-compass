import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const TOTAL_INTERVIEWS = 100;
const SPIKE_FEATURES = ['SSO / SCIM Provisioning', 'Mobile Offline Mode'];

const PM_OWNERSHIP = {
  'Maya Chen': ['Smart Notification Digest', 'Bulk Export to CSV/Excel', 'Custom Dashboard Builder', 'Real-Time Collaboration Cursors'],
  'Jordan Patel': ['In-App Onboarding Checklist', 'Dark Mode', 'Slack/Teams Integration', 'Mobile Offline Mode', 'Multi-Currency Billing'],
  'Sam Okafor': ['Legacy Auth Migration', 'Database Sharding Migration', 'API Rate-Limit Overhaul'],
  'Priya Raman': ['AI Meeting Summarizer', 'Guided AI Setup Assistant', 'AI Report Narration', 'Predictive Churn Scoring'],
  'Alex Whitfield': ['SSO / SCIM Provisioning', 'Audit Log Export', 'Role-Based Permissions v2', 'Webhook Marketplace'],
};

const ALL_FEATURES = Object.values(PM_OWNERSHIP).flat();
const PM_NAMES = Object.keys(PM_OWNERSHIP);

const CLIENT_NAMES = [
  'Cascade Retail', 'BrightPath Health', 'Ironwood Manufacturing', 'Solstice Logistics', 'Harbor Point Financial',
  'Meridian Foods', 'Cobalt Energy', 'Fernwood Insurance', 'Redstone Construction', 'Alpine Freight',
  'Wellspring Clinics', 'Turnstile Media', 'Granite Peak Bank', 'Driftwood Hospitality', 'Northstar Utilities',
  'Copperline Retail', 'Beacon Analytics', 'Thornfield Legal', 'Millrace Manufacturing', 'Vantage Point Consulting',
  'Amberlight Pharma', 'Crestview Realty', 'Pinehollow Logistics', 'Sable Ridge Financial', 'Wavelength Telecom',
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate() {
  const now = new Date();
  const isRecent = Math.random() < 0.3; // 30% chance of landing in the recent window
  const daysAgo = isRecent
    ? Math.floor(Math.random() * 30)
    : 30 + Math.floor(Math.random() * 150);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return { dateStr: date.toISOString().split('T')[0], daysAgo };
}

function pickSecondaryFeatures(pm, isRecent) {
  const otherFeatures = ALL_FEATURES.filter((f) => !PM_OWNERSHIP[pm].includes(f));
  const count = 1 + Math.floor(Math.random() * 3); // 1-3 secondary mentions
  const pool = [...otherFeatures];

  // Bias toward spike features if this interview lands in the recent window
  if (isRecent && Math.random() < 0.55) {
    const spike = randomChoice(SPIKE_FEATURES.filter((f) => !PM_OWNERSHIP[pm].includes(f)));
    if (spike && !pool.includes(spike)) pool.push(spike);
    const selected = [spike];
    while (selected.length < count) {
      const pick = randomChoice(pool);
      if (!selected.includes(pick)) selected.push(pick);
    }
    return selected;
  }

  const selected = [];
  while (selected.length < count) {
    const pick = randomChoice(pool);
    if (!selected.includes(pick)) selected.push(pick);
  }
  return selected;
}

async function generateOne(pm, client, primaryFeature, secondaryFeatures, dateStr) {
  const prompt = `Write a realistic, fictional customer discovery interview transcript between a Product Manager and a client, then decompose it into insight snippets.

Context:
- Interviewer (PM): ${pm}
- Client company: ${client}
- Primary feature being discussed: ${primaryFeature}
- Other features that should come up naturally in conversation: ${secondaryFeatures.join(', ')}

Write a transcript that:
- Is 6-12 exchanges long, natural conversational tone, includes a participant name and title
- Focuses mainly on the primary feature but has the client naturally bring up 1-3 of the other features listed, the way real interviews wander
- Includes a mix of sentiment: at least one genuine pain point or blocker, and at least one piece of praise or positive note somewhere in the conversation
- Do NOT literally label sections; write it as natural dialogue only

Then decompose the transcript into snippets — individual moments where the client raised a pain point, feature request, praise, confusion, or workaround. Only use these exact feature names when tagging (pick the closest match): ${ALL_FEATURES.join(', ')}

Respond with ONLY a raw JSON object in this exact shape, no markdown fences, no preamble:
{
  "transcript": "the full transcript text",
  "snippets": [
    { "text_excerpt": "concise paraphrase, 1-2 sentences, not a verbatim quote", "feature_tag": "exact feature name", "type": "blocker|feature request|praise|confusion|workaround", "sentiment": "positive|neutral|negative" }
  ]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].text.trim();
  return JSON.parse(responseText);
}

async function main() {
  console.log(`Generating ${TOTAL_INTERVIEWS} synthetic interviews...\n`);

  // Build the PM assignment list: 20 interviews per PM, shuffled
  let pmAssignments = [];
  PM_NAMES.forEach((pm) => {
    for (let i = 0; i < TOTAL_INTERVIEWS / PM_NAMES.length; i++) pmAssignments.push(pm);
  });
  pmAssignments = pmAssignments.sort(() => Math.random() - 0.5);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < TOTAL_INTERVIEWS; i++) {
    const pm = pmAssignments[i];
    const client = randomChoice(CLIENT_NAMES);
    const primaryFeature = randomChoice(PM_OWNERSHIP[pm]);
    const { dateStr, daysAgo } = randomDate();
    const isRecent = daysAgo <= 30;
    const secondaryFeatures = pickSecondaryFeatures(pm, isRecent);

    process.stdout.write(`[${i + 1}/${TOTAL_INTERVIEWS}] ${pm} x ${client} (${dateStr})... `);

    try {
      const result = await generateOne(pm, client, primaryFeature, secondaryFeatures, dateStr);

      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          client_name: client,
          interview_date: dateStr,
          interviewer_pm: pm,
          raw_transcript: result.transcript,
        })
        .select()
        .single();

      if (interviewError) throw new Error(interviewError.message);

      const snippetRows = result.snippets.map((s) => ({
        interview_id: interview.id,
        text_excerpt: s.text_excerpt,
        feature_tag: s.feature_tag,
        type: s.type,
        sentiment: s.sentiment,
      }));

      const { error: snippetsError } = await supabase.from('snippets').insert(snippetRows);
      if (snippetsError) throw new Error(snippetsError.message);

      console.log(`✓ ${snippetRows.length} snippets`);
      successCount++;
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      failCount++;
    }

    // Small delay to stay comfortably under rate limits
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.log(`\nDone. ${successCount} succeeded, ${failCount} failed.`);
}

main();