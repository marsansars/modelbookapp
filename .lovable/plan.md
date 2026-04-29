## Preview "What's New" emails before sending

Right now you can only see the changelog entries as a list — there's no way to see what the actual email will look like in someone's inbox until it's been sent. I'll add a **Preview email** button to the Changelog tab so you can review the rendered email at any time using your current unsent entries (and the period label / intro you've typed in).

### What you'll see

A new **Preview email** button next to **Send to all users**. Clicking it opens a dialog showing:

- The email **From** address and **Subject** line (auto-built from the period label)
- The full email body, rendered to look exactly like what recipients will get — same charcoal/gold ModelBook header, Playfair display font, "✨ NEW / 🛠 IMPROVED / 🐛 FIXED" tags, and the line-break/paragraph spacing fix from earlier
- A note at the bottom that the unsubscribe footer will be appended automatically when sent

The preview always reflects the **current** unsent entries in the order they'll be sent, plus whatever you've typed into the **Period label** and **Optional intro** fields above. If you tweak any of those, just click Preview again to refresh.

### Implementation notes (technical)

- New component `src/components/EmailPreviewDialog.tsx` that visually mirrors `supabase/functions/_shared/transactional-email-templates/product-update.tsx` — same inline styles, fonts, colors, category emojis, and the same multi-line `body` rendering (single newline → `<br>`, blank line → new paragraph).
- Edit `src/components/ChangelogTab.tsx`:
  - Add `previewOpen` state.
  - Add a **Preview email** button (eye icon, outline variant) next to the existing Send button. Always enabled — even with zero unsent entries it shows the empty-state body.
  - Render `<EmailPreviewDialog open={previewOpen} ... items={unsent} periodLabel={periodLabel} intro={intro} />`.
- Pure client-side render; no edge function or database call needed.
