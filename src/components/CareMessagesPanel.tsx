"use client";

import { useState } from "react";
import { Phone, SendHorizonal } from "lucide-react";

type ChatMessage = {
  id: string;
  from: "caregiver" | "them";
  text: string;
  time: string;
};

type Thread = {
  id: string;
  name: string;
  relation: string;
  initials: string;
  avatarTone: string;
  phone: string;
  preview: string;
  unread: number;
  messages: ChatMessage[];
};

const initialThreads: Thread[] = [
  {
    id: "amy",
    name: "Amy Lin",
    relation: "Margaret's daughter",
    initials: "AL",
    avatarTone: "bg-coral-soft text-coral-ink",
    phone: "+85255550120",
    preview: "Thanks Sarah — I'll call her after dinner tonight.",
    unread: 1,
    messages: [
      {
        id: "amy-1",
        from: "them",
        text: "Hi Sarah, did Mum take her heart medication last night?",
        time: "09:12",
      },
      {
        id: "amy-2",
        from: "caregiver",
        text: "Not yet — the evening compartment is still unopened. I'll give her a call now.",
        time: "09:14",
      },
      {
        id: "amy-3",
        from: "them",
        text: "Thanks Sarah — I'll call her after dinner tonight.",
        time: "09:15",
      },
    ],
  },
  {
    id: "clinic",
    name: "Dr. Wong's clinic",
    relation: "Margaret's GP",
    initials: "WC",
    avatarTone: "bg-mint-soft text-mint-ink",
    phone: "+85255550131",
    preview: "Please bring the adherence summary to Friday's appointment.",
    unread: 0,
    messages: [
      {
        id: "clinic-1",
        from: "them",
        text: "Please bring the adherence summary to Friday's appointment.",
        time: "Yesterday",
      },
      {
        id: "clinic-2",
        from: "caregiver",
        text: "Will do — I'll print the weekly report on Thursday evening.",
        time: "Yesterday",
      },
    ],
  },
];

export default function CareMessagesPanel() {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState("amy");
  const [draft, setDraft] = useState("");

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? threads[0];

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;

    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              preview: text,
              unread: 0,
              messages: [
                ...thread.messages,
                {
                  id: `msg-${Date.now()}`,
                  from: "caregiver",
                  text,
                  time: "Now",
                },
              ],
            }
          : thread
      )
    );
    setDraft("");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-coral-ink">
          Stay in touch
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          Care messages
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Family, clinic and circle conversations in one place.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.6fr)]">
        <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          <div className="divide-y divide-line-soft">
            {threads.map((thread) => {
              const isActive = thread.id === activeThread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`flex w-full items-center gap-3 px-4 py-4 text-left transition ${
                    isActive ? "bg-cream" : "hover:bg-cream/60"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${thread.avatarTone}`}
                  >
                    {thread.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-ink">
                        {thread.name}
                      </span>
                      {thread.unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">
                          {thread.unread}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-soft">
                      {thread.preview}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          <header className="flex items-center gap-3 border-b border-line-soft px-5 py-4">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${activeThread.avatarTone}`}
            >
              {activeThread.initials}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-ink">
                {activeThread.name}
              </h2>
              <p className="truncate text-xs text-ink-soft">
                {activeThread.relation}
              </p>
            </div>
            <a
              href={`tel:${activeThread.phone}`}
              aria-label={`Call ${activeThread.name}`}
              title={`Call ${activeThread.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition hover:bg-cream"
            >
              <Phone aria-hidden="true" size={16} />
            </a>
          </header>

          <div className="feed-scroll flex-1 space-y-3 overflow-y-auto bg-cream/50 px-5 py-5">
            {activeThread.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.from === "caregiver" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    message.from === "caregiver"
                      ? "rounded-br-md bg-action text-on-action"
                      : "rounded-bl-md border border-line bg-surface text-ink"
                  }`}
                >
                  <p>{message.text}</p>
                  <p
                    className={`mt-1 text-[10px] font-semibold ${
                      message.from === "caregiver"
                        ? "text-on-action/60"
                        : "text-ink-faint"
                    }`}
                  >
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-line-soft px-4 py-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder={`Message ${activeThread.name}…`}
              className="min-w-0 flex-1 rounded-full border border-line bg-cream px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-ink-soft"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!draft.trim()}
              aria-label="Send message"
              title="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-action text-on-action transition hover:bg-action-hover disabled:opacity-40"
            >
              <SendHorizonal aria-hidden="true" size={17} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
