import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function summarize(transcript) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Summarize this customer discovery interview transcript in 2-3 plain sentences — what the interview covered and the main things the customer raised. Write it as a neutral overview, not a list. Respond with ONLY the summary text, no preamble, no quotes.\n\nTranscript:\n${transcript}`,
      },
    ],
  });
  return message.content[0].text.trim();
}

async function main() {
  console.log('Fetching interviews without a summary...');
  const { data: interviews, error } = await supabase
    .from('interviews')
    .select('id, client_name, raw_transcript')
    .is('summary', null);

  if (error) {
    console.error('Failed to fetch interviews:', error.message);
    process.exit(1);
  }

  console.log(`Found ${interviews.length} interviews to backfill.\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < interviews.length; i++) {
    const interview = interviews[i];
    process.stdout.write(`[${i + 1}/${interviews.length}] ${interview.client_name}... `);

    try {
      const summary = await summarize(interview.raw_transcript);
      const { error: updateError } = await supabase
        .from('interviews')
        .update({ summary })
        .eq('id', interview.id);

      if (updateError) throw new Error(updateError.message);

      console.log('✓');
      successCount++;
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      failCount++;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.log(`\nDone. ${successCount} succeeded, ${failCount} failed.`);
}

main();