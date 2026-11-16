// Explicit schema-only migration. Never runs DDL during application requests.
import {readFileSync} from 'node:fs';
const sql=readFileSync('drizzle/0000_private_workbook.sql','utf8');
if(!sql.includes('CREATE TABLE progress'))throw new Error('Missing schema');
console.log('Schema migration checked: drizzle/0000_private_workbook.sql');
