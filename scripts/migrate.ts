import 'dotenv/config';
import { db } from '../lib/db/client';

db();
console.log('migrations applied');
