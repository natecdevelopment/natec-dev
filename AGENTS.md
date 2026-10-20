<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Company facts (contacts, services, directors) live in src/lib/site.ts; pages read from it so details stay consistent.
- Contact inquiries are inserted from the browser into contact_submissions (anon insert-only RLS); no one can read them publicly.
- Brand colours are CSS variables in src/styles.css (--navy, --red, --ivory…) and shadcn tokens alias them; never add other accent colours.
- Home page sections live in src/components/HomeSections.tsx and are reused by inner routes so content stays in one place.
- The `desk:` variant means "not a portrait phone" so phones in landscape get the desktop hero layout.
