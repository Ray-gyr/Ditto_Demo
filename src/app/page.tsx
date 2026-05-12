'use client';

import React, { useState, useRef } from 'react';

// --- Preset Demo Scenarios ---
const PRESETS = [
  {
    label: 'Demo 1 · Verve Coffee',
    place: 'Verve Coffee Roasters',
    personA: { name: 'Marcus', interests: 'rock climbing, film noir, cooking' },
    personB: { name: 'Priya', interests: 'hiking, photography, cooking' },
  },
  {
    label: 'Demo 2 · The Last Bookshop',
    place: 'The Last Bookshop',
    personA: { name: 'Daniel', interests: 'jazz piano, stand-up comedy, travel' },
    personB: { name: 'Yuki', interests: 'ceramics, foreign films, tea ceremony' },
  },
];

// Maximum character length for all free-text inputs
const MAX_INPUT_LENGTH = 300;

// Fixed error message shown to the user — never expose raw server error strings
const USER_FACING_ERROR = 'Oops, something went wrong. Please try again.';

type Config = {
  place: string;
  personA: { name: string; interests: string };
  personB: { name: string; interests: string };
};

export default function Home() {
  const [activePreset, setActivePreset] = useState<number>(0);
  const [config, setConfig] = useState<Config>(PRESETS[0]);

  const [personAMessage, setPersonAMessage] = useState<string>('');
  const [personBMessage, setPersonBMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Holds the AbortController for the current in-flight request so we can
  // cancel it if the user switches presets or re-submits before it resolves.
  const abortRef = useRef<AbortController | null>(null);

  const handleSelectPreset = (index: number) => {
    setActivePreset(index);
    setConfig(PRESETS[index]);
    // Cancel any in-flight request when the user switches scenarios
    abortRef.current?.abort();
    setPersonAMessage('');
    setPersonBMessage('');
  };

  const handleGenerate = async () => {
    // Cancel any previous request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setPersonAMessage('');
    setPersonBMessage('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: controller.signal,
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        // Extract a safe error string from the response without exposing
        // raw server internals to the user
        const serverMsg =
          data &&
            typeof data === 'object' &&
            'error' in data &&
            typeof (data as Record<string, unknown>).error === 'string'
            ? (data as { error: string }).error
            : null;

        // Log the server message internally for debugging, but show only the
        // fixed user-facing string in the UI
        console.error('[handleGenerate] API error:', serverMsg ?? res.status);
        throw new Error(USER_FACING_ERROR);
      }

      // Narrow the response type before accessing fields
      const parsed =
        data &&
          typeof data === 'object' &&
          'personA_task' in data &&
          'personB_task' in data
          ? (data as { personA_task: string; personB_task: string })
          : null;

      if (!parsed) {
        throw new Error(USER_FACING_ERROR);
      }

      setPersonAMessage(parsed.personA_task || 'No task generated.');
      setPersonBMessage(parsed.personB_task || 'No task generated.');
    } catch (error: unknown) {
      // Ignore abort errors — they are intentional, not failures
      if (error instanceof DOMException && error.name === 'AbortError') return;

      const message = error instanceof Error ? error.message : USER_FACING_ERROR;
      console.error('[handleGenerate]', message);
      setPersonAMessage(USER_FACING_ERROR);
      setPersonBMessage(USER_FACING_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  // Shared onChange factory that enforces the MAX_INPUT_LENGTH cap
  const makeInputHandler =
    (updater: (value: string) => Config) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        // Trim at the max length as a client-side guard (maxLength on the input
        // element is the primary UX enforcement; this is a safety net)
        const value = e.target.value.slice(0, MAX_INPUT_LENGTH);
        setActivePreset(-1);
        setConfig(updater(value));
      };

  const PhoneMockup = ({ message }: { message: string }) => (
    <div className="flex flex-col h-[600px] w-full max-w-[320px] bg-white dark:bg-black relative border-4 border-zinc-300 dark:border-zinc-800 rounded-[3rem] overflow-hidden shadow-xl mx-auto">
      {/* Dynamic Island mock */}
      <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
        <div className="w-1/3 h-5 bg-zinc-300 dark:bg-zinc-800 rounded-b-xl"></div>
      </div>

      {/* Top Navigation Bar */}
      <div className="flex flex-col items-center justify-center pt-10 pb-2 border-b border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur-md sticky top-0 z-10">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-1 text-xl">
          🤖
        </div>
        <h1 className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
          Ditto AI
        </h1>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end pb-8">
        {!message && isLoading && (
          <div className="w-full flex justify-start">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        {message && (
          <>
            <div className="w-full flex justify-center mb-1">
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                Wednesday 9:38 AM
              </span>
            </div>
            <div className="w-full flex justify-start">
              <div className="message-bubble message-bubble-ai tail self-start">
                {/* Rendered as a plain text node — no dangerouslySetInnerHTML */}
                {message}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="p-4 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-gray-200 dark:border-zinc-800 sticky bottom-0 z-10">
        <div className="flex items-end gap-2 bg-gray-100 dark:bg-zinc-900 rounded-3xl p-1 border border-gray-200 dark:border-zinc-800">
          <button type="button" className="p-2 text-gray-400 rounded-full mb-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <div className="flex-1 py-1.5 px-2 text-sm text-gray-400">iMessage</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-8 flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center font-sans">

      {/* Left Configuration Panel */}
      <div className="w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 shrink-0">
        <h2 className="text-xl font-semibold mb-2 dark:text-white">Ditto Scenario Setup</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Select a preset or edit freely below.</p>

        {/* Preset Selector */}
        <div className="flex gap-2 mb-6">
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => handleSelectPreset(i)}
              className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg border transition-all ${activePreset === i
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:border-blue-400'
                }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dating Place</label>
            <input
              type="text"
              maxLength={MAX_INPUT_LENGTH}
              className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 bg-transparent dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={config.place}
              onChange={makeInputHandler(value => ({ ...config, place: value }))}
            />
          </div>

          {/* Person A */}
          <div className="p-4 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Person A</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  maxLength={MAX_INPUT_LENGTH}
                  className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={config.personA.name}
                  onChange={makeInputHandler(value => ({
                    ...config,
                    personA: { ...config.personA, name: value },
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Interests</label>
                <input
                  type="text"
                  maxLength={MAX_INPUT_LENGTH}
                  className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={config.personA.interests}
                  onChange={makeInputHandler(value => ({
                    ...config,
                    personA: { ...config.personA, interests: value },
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Person B */}
          <div className="p-4 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Person B</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  maxLength={MAX_INPUT_LENGTH}
                  className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={config.personB.name}
                  onChange={makeInputHandler(value => ({
                    ...config,
                    personB: { ...config.personB, name: value },
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Interests</label>
                <input
                  type="text"
                  maxLength={MAX_INPUT_LENGTH}
                  className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={config.personB.interests}
                  onChange={makeInputHandler(value => ({
                    ...config,
                    personB: { ...config.personB, interests: value },
                  }))}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-4 flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : 'Generate Demo'}
          </button>
        </div>
      </div>

      {/* Right Mockups Panel */}
      <div className="flex-1 flex flex-col xl:flex-row gap-8 justify-center items-center xl:items-start w-full">
        <div className="w-full flex flex-col items-center">
          <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-4">{config.personA.name}&apos;s Phone</h3>
          <PhoneMockup message={personAMessage} />
        </div>
        <div className="w-full flex flex-col items-center">
          <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-4">{config.personB.name}&apos;s Phone</h3>
          <PhoneMockup message={personBMessage} />
        </div>
      </div>

    </div>
  );
}