import { useState } from 'react';
import { PMS } from './constants/nimbus';
import Dashboard from './components/Dashboard';
import IngestDemo from './components/IngestDemo';
import InterviewLibrary from './components/InterviewLibrary';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'library', label: 'Discovery Corpus' },
  { id: 'ingest', label: 'How It Works' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPm, setSelectedPm] = useState('');
  const [focusInterviewId, setFocusInterviewId] = useState(null);

  function handleViewFullInterview(interviewId) {
    setFocusInterviewId(interviewId);
    setActiveTab('library');
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-sans text-lg font-semibold tracking-wide">Discovery Compass</h1>
            <p className="text-sm text-muted mt-0.5">
              Every discovery interview, tagged and searchable across the whole team — not just the PM who ran it.
            </p>
          </div>
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-panel2 text-white'
                    : 'text-muted hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            selectedPm={selectedPm}
            setSelectedPm={setSelectedPm}
            pms={PMS}
            onViewFullInterview={handleViewFullInterview}
          />
        )}
        {activeTab === 'library' && (
          <InterviewLibrary focusInterviewId={focusInterviewId} />
        )}
        {activeTab === 'ingest' && <IngestDemo />}
      </main>
    </div>
  );
}