import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getBearingAngle, TYPE_COLORS, FEATURES } from '../constants/nimbus';

const PAGE_SIZE = 10;

export default function Dashboard({ selectedPm, setSelectedPm, pms, onViewFullInterview }) {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featureFilter, setFeatureFilter] = useState('');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeSnippet, setActiveSnippet] = useState(null);
  const [activeInterview, setActiveInterview] = useState(null);

  useEffect(() => {
    async function fetchSnippets() {
      setLoading(true);
      const { data, error } = await supabase
        .from('snippets')
        .select('id, text_excerpt, feature_tag, type, sentiment, created_at, interview_id, interviews!inner(client_name, interview_date, interviewer_pm, summary)')
        .order('interview_date', { referencedTable: 'interviews', ascending: false });

      if (error) {
        console.error('Failed to fetch snippets:', error.message);
      } else {
        setSnippets(data);
      }
      setLoading(false);
    }
    fetchSnippets();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [featureFilter, selectedPm, search]);

  const pmOwnedFeatures = useMemo(() => {
    if (!selectedPm) return null;
    return new Set(FEATURES.filter((f) => f.ownerPm === selectedPm).map((f) => f.name));
  }, [selectedPm]);

  const trending = useMemo(() => {
    const dated = snippets.filter((s) => s.interviews?.interview_date);
    if (dated.length === 0) return { rising: null, cooling: null };

    const mostRecentDate = dated.reduce((max, s) => {
      const d = new Date(s.interviews.interview_date);
      return d > max ? d : max;
    }, new Date(0));

    const cutoff30 = new Date(mostRecentDate);
    cutoff30.setDate(cutoff30.getDate() - 30);
    const cutoff60 = new Date(mostRecentDate);
    cutoff60.setDate(cutoff60.getDate() - 60);

    const recentCounts = {};
    const priorCounts = {};

    dated.forEach((s) => {
      const interviewDate = new Date(s.interviews.interview_date);
      if (interviewDate >= cutoff30) {
        recentCounts[s.feature_tag] = (recentCounts[s.feature_tag] || 0) + 1;
      } else if (interviewDate >= cutoff60) {
        priorCounts[s.feature_tag] = (priorCounts[s.feature_tag] || 0) + 1;
      }
    });

    const deltas = Object.keys({ ...recentCounts, ...priorCounts }).map((feature) => {
      const recent = recentCounts[feature] || 0;
      const prior = priorCounts[feature] || 0;
      return { feature, recent, prior, delta: recent - prior };
    });

    const rising = [...deltas].sort((a, b) => b.delta - a.delta)[0];
    const cooling = [...deltas].sort((a, b) => a.delta - b.delta)[0];

    return { rising, cooling };
  }, [snippets]);

  const filtered = useMemo(() => {
    return snippets.filter((s) => {
      if (featureFilter && s.feature_tag !== featureFilter) return false;
      if (pmOwnedFeatures && !pmOwnedFeatures.has(s.feature_tag)) return false;
      if (search && !s.text_excerpt.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [snippets, featureFilter, search, pmOwnedFeatures]);

  const visible = filtered.slice(0, visibleCount);

  const allFeatures = useMemo(() => {
    return [...new Set(snippets.map((s) => s.feature_tag))].sort();
  }, [snippets]);

  if (loading) {
    return <div className="text-muted">Loading insights...</div>;
  }

  return (
    <div>
      <div className="text-xs text-muted mb-2">Trending compares the last 30 days against the 30 days before that</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {trending.rising && (
          <div className="bg-panel2 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-accent text-xs mb-1">
              <span className="text-sm">↑</span>
              <span>Trending</span>
            </div>
            <div className="text-sm font-medium">{trending.rising.feature}</div>
            <div className="font-mono text-xs text-muted mt-0.5">
              {trending.rising.recent} insights in the last 30 days, up from {trending.rising.prior}
            </div>
          </div>
        )}
        {trending.cooling && (
          <div className="bg-panel border border-border rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-muted text-xs mb-1">
              <span className="text-sm">↓</span>
              <span>Trending</span>
            </div>
            <div className="text-sm font-medium">{trending.cooling.feature}</div>
            <div className="font-mono text-xs text-muted mt-0.5">
              {trending.cooling.recent} insights in the last 30 days, down from {trending.cooling.prior}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          placeholder="Search insights"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-panel border border-border rounded px-3 py-2 text-sm placeholder-muted focus:outline-none focus:border-accent"
        />
        <select
          value={featureFilter}
          onChange={(e) => setFeatureFilter(e.target.value)}
          className="bg-panel border border-border rounded px-3 py-2 text-sm sm:w-48"
        >
          <option value="">All features</option>
          {allFeatures.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          value={selectedPm}
          onChange={(e) => setSelectedPm(e.target.value)}
          className="bg-panel border border-border rounded px-3 py-2 text-sm sm:w-44"
        >
          <option value="">All PMs</option>
          {pms.map((pm) => (
            <option key={pm} value={pm}>My features: {pm}</option>
          ))}
        </select>
      </div>

      <div className="font-mono text-xs text-muted mb-3">
        Showing {visible.length} of {filtered.length} insights, sorted by interview date - most recent discovery session first
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((snippet) => {
          const colors = TYPE_COLORS[snippet.type] || TYPE_COLORS.confusion;
          const angle = getBearingAngle(snippet.feature_tag);
          return (
            <button
              key={snippet.id}
              onClick={() => {
                setActiveSnippet(snippet);
                setActiveInterview(snippet.interviews);
              }}
              className={`text-left bg-panel border-l-[3px] ${colors.border} rounded px-3 py-2.5 hover:bg-panel2 transition-colors flex items-start gap-3`}
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
                <div className="font-mono text-xs text-muted mt-1 flex flex-wrap gap-x-2">
                  <span className={colors.text}>{snippet.type}</span>
                  <span>· {snippet.feature_tag}</span>
                  <span>· {snippet.interviews?.client_name}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-muted text-sm py-8 text-center">No insights match these filters.</div>
      )}

      {visibleCount < filtered.length && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mt-4 w-full bg-panel border border-border rounded py-2 text-sm text-muted hover:text-white hover:border-accent transition-colors"
        >
          Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
        </button>
      )}

      {activeSnippet && activeInterview && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setActiveSnippet(null)}
        >
          <div
            className="bg-panel border border-border rounded-lg p-5 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-mono text-xs text-muted mb-1">
              {activeInterview.client_name} · {activeInterview.interview_date} · {activeInterview.interviewer_pm}
            </div>
            <p className="text-sm leading-relaxed mb-4">{activeInterview.summary}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onViewFullInterview(activeSnippet.interview_id)}
                className="bg-accent text-white text-sm px-3 py-1.5 rounded hover:opacity-90"
              >
                View full interview
              </button>
              <button
                onClick={() => setActiveSnippet(null)}
                className="text-muted text-sm px-3 py-1.5 rounded hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}