import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getBearingAngle, TYPE_COLORS, FEATURES } from '../constants/nimbus';

const DEMO_CLIENT = 'Northwind Logistics';

function ownerOf(featureName) {
  const f = FEATURES.find((f) => f.name === featureName);
  return f ? f.ownerPm : null;
}

export default function IngestDemo() {
  const [interview, setInterview] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    async function fetchDemoData() {
      setLoading(true);
      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .select('id, client_name, interview_date, interviewer_pm, raw_transcript')
        .eq('client_name', DEMO_CLIENT)
        .limit(1)
        .single();

      if (interviewError || !interviewData) {
        console.error('Failed to fetch demo interview:', interviewError?.message);
        setLoading(false);
        return;
      }

      const { data: snippetData, error: snippetError } = await supabase
        .from('snippets')
        .select('id, text_excerpt, feature_tag, type, sentiment')
        .eq('interview_id', interviewData.id)
        .order('created_at', { ascending: true });

      if (snippetError) {
        console.error('Failed to fetch demo snippets:', snippetError.message);
      }

      setInterview(interviewData);
      setSnippets(snippetData || []);
      setLoading(false);
    }
    fetchDemoData();
  }, []);

  function runDemo() {
    setRunning(true);
    setRevealedCount(0);
    snippets.forEach((_, i) => {
      setTimeout(() => {
        setRevealedCount((count) => count + 1);
      }, (i + 1) * 700);
    });
  }

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  if (!interview) {
    return (
      <div className="text-muted text-sm">
        Demo interview not found. Make sure an interview for "{DEMO_CLIENT}" exists in the database.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-medium mb-2">How Discovery Compass reads an interview</h2>
        <p className="text-sm text-muted leading-relaxed">
          This is a real interview from the archive, already processed. Click on "Run Analysis" to watch it happen
          again — Claude reads the raw transcript and pulls out individual insights, tagging each one
          to the specific feature it's about and the PM who owns that feature. One interviewer conducted
          this conversation, but the insights it produces route across the whole team, not just back to them.
        </p>
      </div>

      <div className="inline-block bg-panel2 text-xs text-muted font-mono px-2 py-1 rounded mb-4">
        Replaying a real analysis — nothing here is written live
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <div className="font-mono text-xs text-muted mb-2">
          {interview.client_name} · {interview.interview_date} · {interview.interviewer_pm}
        </div>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/90 max-h-64 overflow-y-auto">
          {interview.raw_transcript}
        </pre>
      </div>

      {!running && (
        <button
          onClick={runDemo}
          className="bg-accent text-white text-sm px-4 py-2 rounded hover:opacity-90 mb-4"
        >
          Run analysis
        </button>
      )}

      {running && (
        <>
          <div className="font-mono text-xs text-muted mb-3">
            {revealedCount} of {snippets.length} insights identified
          </div>
          <div className="flex flex-col gap-2">
            {snippets.slice(0, revealedCount).map((snippet) => {
              const colors = TYPE_COLORS[snippet.type] || TYPE_COLORS.confusion;
              const angle = getBearingAngle(snippet.feature_tag);
              const owner = ownerOf(snippet.feature_tag);
              return (
                <div
                  key={snippet.id}
                  className={`bg-panel border-l-[3px] ${colors.border} rounded px-3 py-2.5 flex items-start gap-3 animate-[fadeIn_0.4s_ease-in]`}
                >
                  <svg width="16" height="16" viewBox="0 0 18 18" className="mt-0.5 shrink-0">
                    <circle cx="9" cy="9" r="7.5" fill="none" stroke="#2E3644" strokeWidth="1" />
                    <line
                      x1="9" y1="9" x2="9" y2="3"
                      stroke="currentColor"
                      className={colors.text}
                      strokeWidth="1.5"
                      transform={`rotate(${angle} 9 9)`}
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">{snippet.text_excerpt}</p>
                    <div className="font-mono text-xs text-muted mt-1 flex flex-wrap gap-x-2 items-center">
                      <span className={colors.text}>{snippet.type}</span>
                      <span>· {snippet.feature_tag}</span>
                      {owner && (
                        <span className="bg-panel2 text-white/80 px-1.5 py-0.5 rounded text-[11px]">
                          → {owner}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}