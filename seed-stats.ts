import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const totalViews = (db.prepare('SELECT SUM(views) as total FROM prompts').get() as any).total || 0;
  if (totalViews === 0) {
    db.prepare('UPDATE prompts SET views = ABS(RANDOM() % 500) + 10, copies = ABS(RANDOM() % 100) + 1').run();
    console.log('Updated prompts with random views and copies.');
  } else {
    console.log('Prompts already have views.');
  }
} catch (e) {
  console.error('Error:', e);
}
