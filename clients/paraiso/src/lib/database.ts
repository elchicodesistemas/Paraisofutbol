import {env} from 'cloudflare:workers';
export function resources(){return env as unknown as {DB:D1Database;FILES:R2Bucket;ADMIN_EMAIL?:string}}
export function database(){return resources().DB}
