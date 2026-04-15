// Supabase Edge Function — Jira API proxy
// Needed because Jira Cloud REST API does not allow cross-origin browser requests.
//
// Deploy with:
//   supabase functions deploy jira-proxy
//
// Requires: supabase CLI installed + project linked (supabase link --project-ref <ref>)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { domain, email, apiToken, path } = await req.json() as {
      domain: string;
      email: string;
      apiToken: string;
      path: string;
    };

    if (!domain || !email || !apiToken || !path) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Sanitise: only allow /rest/api/3/* paths
    if (!path.startsWith('/')) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const credentials = btoa(`${email}:${apiToken}`);
    const url = `https://${domain}/rest/api/3${path}`;

    const jiraRes = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    });

    const data = await jiraRes.json();

    return new Response(JSON.stringify(data), {
      status: jiraRes.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
