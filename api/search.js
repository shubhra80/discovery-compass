import { VoyageAIClient } from 'voyageai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing "question" in request body' });
  }

  try {
    const embedResponse = await voyage.embed({
      input: [question],
      model: 'voyage-3.5-lite',
      inputType: 'query',
      outputDimension: 1024,
    });
    const questionEmbedding = embedResponse.data[0].embedding;

    const { data: matches, error: matchError } = await supabase.rpc('match_snippets', {
      query_embedding: questionEmbedding,
      match_count: 10,
    });
    if (matchError) throw new Error(matchError.message);

    const context = matches
      .map((m, i) => `[${i + 1}] (${m.feature_tag}, ${m.sentiment}): ${m.text_excerpt}`)
      .join('\n\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are answering a product manager's question using only the customer interview snippets below. Cite snippets by their bracketed number, e.g. [1], [3]. If the snippets don't contain enough to answer, say so honestly rather than guessing.\n\nSnippets:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });

    res.status(200).json({
      answer: message.content[0].text,
      sources: matches,
    });
  } catch (err) {
    console.error('Search failed:', err.message);
    res.status(500).json({ error: 'Something went wrong processing your search' });
  }
}
