import { useState } from 'react';

export default function SemanticSearch() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error('Search failed. Please try again.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-medium mb-2">Ask the discovery corpus</h2>
        <p className="text-sm text-muted leading-relaxed">
          Ask a question in plain language. This searches by meaning across every interview,
          not just keywords or tags — so it can surface relevant feedback even if it doesn't
          use the exact words you searched for.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="e.g. what have users said about pricing?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="flex-1 bg-panel border border-border rounded px-3 py-2 text-sm placeholder-muted focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-400 mb-4">{error}</div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="bg-panel border border-border rounded-lg p-4">
            <div className="font-mono text-xs text-muted mb-2">Answer</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
          </div>

          <div>
            <div className="font-mono text-xs text-muted mb-2">
              Sources ({result.sources.length})
            </div>
            <div className="flex flex-col gap-2">
              {result.sources.map((source, i) => (
                <div
                  key={source.id}
                  className="bg-panel border-l-[3px] border-border rounded px-3 py-2.5"
                >
                  <p className="text-sm leading-relaxed">
                    <span className="text-muted font-mono text-xs mr-2">[{i + 1}]</span>
                    {source.text_excerpt}
                  </p>
                  <div className="font-mono text-xs text-muted mt-1 flex flex-wrap gap-x-2">
                    <span>{source.type}</span>
                    <span>· {source.feature_tag}</span>
                    <span>· {source.sentiment}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}