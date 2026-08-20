import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function InterviewLibrary({ focusInterviewId }) {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const refs = useRef({});

  useEffect(() => {
    async function fetchInterviews() {
      setLoading(true);
      const { data, error } = await supabase
        .from('interviews')
        .select('id, client_name, interview_date, interviewer_pm, summary, raw_transcript')
        .order('interview_date', { ascending: false });

      if (error) {
        console.error('Failed to fetch interviews:', error.message);
      } else {
        setInterviews(data);
      }
      setLoading(false);
    }
    fetchInterviews();
  }, []);

  useEffect(() => {
    if (focusInterviewId && refs.current[focusInterviewId]) {
      setExpandedId(focusInterviewId);
      refs.current[focusInterviewId].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusInterviewId, interviews]);

  const filtered = interviews.filter((i) =>
    i.client_name.toLowerCase().includes(search.toLowerCase()) ||
    i.interviewer_pm.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-muted">Loading interviews...</div>;
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search by client or PM"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-panel border border-border rounded px-3 py-2 text-sm placeholder-muted mb-4 focus:outline-none focus:border-accent"
      />

      <div className="font-mono text-xs text-muted mb-3">{filtered.length} interviews</div>

      <div className="flex flex-col gap-2">
        {filtered.map((interview) => {
          const isExpanded = expandedId === interview.id;
          return (
            <div
              key={interview.id}
              ref={(el) => (refs.current[interview.id] = el)}
              className={`bg-panel border rounded-lg p-4 ${
                interview.id === focusInterviewId ? 'border-accent' : 'border-border'
              }`}
            >
              <button
                className="w-full text-left"
                onClick={() => setExpandedId(isExpanded ? null : interview.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{interview.client_name}</div>
                    <div className="font-mono text-xs text-muted mt-0.5">
                      {interview.interview_date} · {interview.interviewer_pm}
                    </div>
                  </div>
                  <span className="text-muted text-xs">{isExpanded ? '−' : '+'}</span>
                </div>
                <p className="text-sm text-muted mt-2 leading-relaxed">{interview.summary}</p>
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/90">
                    {interview.raw_transcript}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-muted text-sm py-8 text-center">No interviews match this search.</div>
      )}
    </div>
  );
}