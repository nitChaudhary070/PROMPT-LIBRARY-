import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const info = db.pragma('table_info(prompts)');
  console.log('Columns in prompts table:', info);
  
  const stats = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('Users count:', stats);
  
  const views = db.prepare('SELECT SUM(views) as total FROM prompts').get();
  console.log('Total views:', views);
} catch (e) {
  console.error('Error:', e);
}
