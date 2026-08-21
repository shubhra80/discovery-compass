import 'dotenv/config';
import { VoyageAIClient } from 'voyageai';
import { createClient } from '@supabase/supabase-js';

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const BATCH_SIZE = 30;
const DELAY_MS = 21000; // 21 seconds between batches, staying under the 3-requests-per-minute limit

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function embedBatch(snippets) {
  const response = await voyage.embed({
    input: snippets.map((s) => s.text_excerpt),
    model: 'voyage-3.5-lite',
    inputType: 'document',
    outputDimension: 1024,
  });
  return response.data.map((d) => d.embedding);
}

async function main() {
  console.log('Fetching snippets without an embedding...');
  const { data: snippets, error } = await supabase
    .from('snippets')
    .select('id, text_excerpt')
    .is('embedding', null);

  if (error) {
    console.error('Failed to fetch snippets:', error.message);
    process.exit(1);
  }

  console.log(`Found ${snippets.length} snippets to backfill.\n`);

  const batches = chunk(snippets, BATCH_SIZE);
  let successCount = 0;
  let failCount = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    process.stdout.write(`Batch ${b + 1}/${batches.length} (${batch.length} snippets)... `);
    try {
      const embeddings = await embedBatch(batch);
      for (let i = 0; i < batch.length; i++) {
        const { error: updateError } = await supabase
          .from('snippets')
          .update({ embedding: embeddings[i] })
          .eq('id', batch[i].id);
        if (updateError) throw new Error(updateError.message);
      }
      console.log(`✓ (${batch.length} saved)`);
      successCount += batch.length;
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      failCount += batch.length;
    }
    if (b < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`\nDone. ${successCount} succeeded, ${failCount} failed.`);
}

main();