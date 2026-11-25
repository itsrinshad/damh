# SYMBIOTES website (v9.1)

Upload the contents of this zip to your GitHub repo (replace existing files). Netlify builds it automatically.
Do not upload node_modules or dist.

Build settings are already in netlify.toml (command: npm run build, publish: dist, Node 20).
Environment variables (Netlify > Site settings > Environment variables), see .env.example:
  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   (never the service_role key)

public/config.js holds the PUBLIC push key. Database scripts and the push server function are in the separate
symbiotes-sql-and-server.zip.
