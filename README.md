Most teams are spending thousands a month on GitHub Copilot, ChatGPT, Cursor, and similar tools with no way to quantify the return. dev-roi turns your velocity numbers and subscription costs
  into a clear ROI picture — so you know what to keep, what to cut, and where to double down.                                                                                                                                                                                                                                                                                                           
  ---                                                                                                                                                                                               
  What it does                                                                                                                                                                                      
                                                                                                                                                                                                    
  You set up your workspace in three steps: your team size, the AI tools you're paying for, and your before/after productivity numbers (tickets or PRs per developer per month). From there, the app   calculates:

  - ROI multiple — how many dollars of developer productivity you recover for every dollar spent on AI
  - Net monthly value — the dollar gain after subtracting subscription costs
  - Velocity lift — how much faster your team is shipping since adopting AI tools
  - Per-tool breakdown — which tools are earning their keep and which are dragging down your ROI

  Every KPI is fully transparent. Click any number to see the exact formula and step-by-step arithmetic behind it — no black boxes.

  ---
  Who it's for

  Engineering managers and CTOs who want to make data-driven decisions about their AI tool budget. Whether you're justifying the spend to leadership, deciding whether to expand a Copilot rollout,
  or figuring out if that $600/month Gemini subscription is actually being used — dev-roi gives you the numbers to act on.

  ---
  Key features

  - Tool comparison chart — visualises monthly cost vs value generated per tool, colour-coded by ROI health (green = great, amber = watch it, red = cut it)
  - Calculation modal — click any KPI to see a plain-English walkthrough of how the number was derived
  - Smart insight cards — auto-generated observations like "GitHub Copilot delivers your highest return at 4.1× ROI" or "Gemini Advanced needs attention — only 0.6× on $240/mo"
  - Demo mode — try it instantly with realistic sample data, no sign-up required
  - Settings baseline — update your velocity numbers over time and track ROI trend across snapshots
  - Secure by default — built on Supabase with row-level security; each workspace is fully isolated per user

  ---
  Tech

  React + TypeScript, Vite, Tailwind CSS, Recharts, Zustand, Supabase (auth + database), deployed on Vercel.
