#!/usr/bin/env node
/**
 * Rádió69 web push kulcspár és cron token generálása.
 * Futtatás: node scripts/generate-radio69-push-secrets.mjs
 * A privát kulcsot és a cron tokent ne töltsd fel GitHubra!
 */
import { createECDH, randomBytes } from 'node:crypto';

const ecdh = createECDH('prime256v1');
ecdh.generateKeys();

const output = {
  vapidPublicKey: ecdh.getPublicKey().toString('base64url'),
  vapidPrivateKey: ecdh.getPrivateKey().toString('base64url'),
  cronSecret: randomBytes(32).toString('base64url')
};

console.log('\nRÁDIÓ69 – PUSH ÉRTESÍTÉSI KULCSOK\n');
console.log('1) NYILVÁNOS kulcs – ezt másold a show-push-config.js fájlba:');
console.log(output.vapidPublicKey);
console.log('\n2) PRIVÁT kulcs – csak Supabase Secret legyen, GitHubra NE töltsd fel:');
console.log(output.vapidPrivateKey);
console.log('\n3) CRON titok – Supabase Secret és a scheduler SQL Vault-bejegyzése használja:');
console.log(output.cronSecret);
console.log('\nA privát kulcsot és a cron titkot kezeld jelszóként. Ne küldd el nyilvános chatben, és ne commitold a repozitóriumba.\n');
