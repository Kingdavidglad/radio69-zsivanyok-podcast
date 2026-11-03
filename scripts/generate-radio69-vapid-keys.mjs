#!/usr/bin/env node
/**
 * Rádió69 – kizárólag VAPID kulcspár újragenerálása.
 * A CRON titkot szándékosan nem módosítja.
 * Futtatás a projekt gyökeréből: node scripts/generate-radio69-vapid-keys.mjs
 */
import { createECDH } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const ecdh = createECDH('prime256v1');
ecdh.generateKeys();

const publicKey = ecdh.getPublicKey().toString('base64url');
const privateKey = ecdh.getPrivateKey().toString('base64url');

writeFileSync('show-push-public-key.txt', `${publicKey}\n`, { flag: 'w' });

console.log('\nRÁDIÓ69 – ÚJ VAPID KULCSPÁR\n');
console.log('NYILVÁNOS KULCS – elmentve a show-push-public-key.txt fájlba:');
console.log(publicKey);
console.log('\nPRIVÁT KULCS – ezt csak a Supabase RADIO69_VAPID_PRIVATE_KEY titok értékeként add meg:');
console.log(privateKey);
console.log('\nFONTOS:');
console.log('- A Supabase-ben frissítsd a RADIO69_VAPID_PUBLIC_KEY és RADIO69_VAPID_PRIVATE_KEY értékét erre az új párra.');
console.log('- A weboldal show-push-config.js fájljába a NYILVÁNOS kulcs kerüljön.');
console.log('- A CRON titkot nem kell módosítani.');
console.log('- A privát kulcsot ne töltsd fel GitHubra és ne küldd el senkinek.');
console.log('- Az új kulcs miatt az esetleges korábbi böngészős feliratkozásokat újra kell majd engedélyezni.\n');
