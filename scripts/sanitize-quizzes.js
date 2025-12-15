#!/usr/bin/env node
/*
One-time script to ensure each learning module section contains a [QUIZ:...]...[/QUIZ] block.

Usage (PowerShell):
$env:REACT_APP_SUPABASE_URL = '<your-url>'; $env:REACT_APP_SUPABASE_ANON_KEY = '<your-key>'; node scripts/sanitize-quizzes.js

Set DRY_RUN=1 to only report changes without writing.
*/
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const DRY_RUN = process.env.DRY_RUN || process.env.DRYRUN || process.env.npm_config_dryrun;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const quizRegex = /\[QUIZ:[^\]]*\][\s\S]*?\[\/QUIZ\]/i;
const createDefaultQuiz = (k) =>
  `\n\n[QUIZ:truefalse]\nQuestion: Is ${k} secure?\nOptions: True, False  \nAnswer: True\nExplanation: ${k} uses advanced security features.\n[/QUIZ]`;

(async () => {
  try {
    console.log('Fetching learning modules with content...');
    const { data: modules, error } = await supabase
      .from('learning_modules')
      .select('id, title, content, taglish_content')
      .not('content', 'is', null);
    if (error) throw error;
    console.log(`Found ${modules.length} modules with content.`);

    let updatedCount = 0;
    for (const mod of modules) {
      const content = mod.content || {};
      const sections = Array.isArray(content.sections) ? content.sections : [];
      let changed = false;
      const newSections = sections.map((s) => {
        const body = s.body || '';
        if (!quizRegex.test(body)) {
          changed = true;
          const titleForQuiz = s.title || mod.title || 'this topic';
          console.log(`Module ${mod.id} (${mod.title}): section '${titleForQuiz}' missing QUIZ — will append default quiz.`);
          return { ...s, body: body.trim() + createDefaultQuiz(titleForQuiz) };
        }
        return s;
      });

      if (changed) {
        updatedCount++;
        const newContent = { ...content, sections: newSections };
        if (DRY_RUN) {
          console.log(`[DRY RUN] Would update module ${mod.id}`);
        } else {
          const { error: updErr } = await supabase
            .from('learning_modules')
            .update({ content: newContent })
            .eq('id', mod.id);
          if (updErr) {
            console.error(`Failed to update module ${mod.id}:`, updErr.message || updErr);
          } else {
            console.log(`Updated module ${mod.id} successfully.`);
          }
        }
      }
    }

    console.log(`Completed. Modules updated: ${updatedCount}`);
  } catch (err) {
    console.error('Script error:', err.message || err);
    process.exit(1);
  }
})();
