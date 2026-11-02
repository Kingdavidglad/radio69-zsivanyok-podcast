-- Rádió69 műsorértesítések – egyperces Supabase Cron ütemezés
-- Előfeltétel: a pg_cron, pg_net és Supabase Vault bővítmény legyen bekapcsolva.
-- A két helyőrzőt a beállítási útmutató szerint cseréld ki, majd ezt az SQL-t csak egyszer futtasd.
-- A titkok a Vaultba kerülnek, nem a GitHub-repozitóriumba.

do $$
declare
  cron_secret_id uuid;
  supabase_key_id uuid;
begin
  select id into cron_secret_id from vault.secrets where name = 'radio69_cron_secret' limit 1;
  if cron_secret_id is null then
    perform vault.create_secret(
      'PASTE_A_GENERATOR_ALTAL_KIIRT_CRON_SECRET',
      'radio69_cron_secret',
      'Rádió69 cron hívás hitelesítése'
    );
  else
    perform vault.update_secret(
      cron_secret_id,
      'PASTE_A_GENERATOR_ALTAL_KIIRT_CRON_SECRET',
      'radio69_cron_secret',
      'Rádió69 cron hívás hitelesítése'
    );
  end if;

  select id into supabase_key_id from vault.secrets where name = 'radio69_supabase_secret_key' limit 1;
  if supabase_key_id is null then
    perform vault.create_secret(
      'PASTE_A_SUPABASE_SECRET_API_KEY',
      'radio69_supabase_secret_key',
      'Rádió69 Edge Function meghívásához használt Supabase secret API-kulcs'
    );
  else
    perform vault.update_secret(
      supabase_key_id,
      'PASTE_A_SUPABASE_SECRET_API_KEY',
      'radio69_supabase_secret_key',
      'Rádió69 Edge Function meghívásához használt Supabase secret API-kulcs'
    );
  end if;
end;
$$;

-- Ha a lekérdezést újra futtatnád, a régi azonos nevű feladatot előbb eltávolítjuk.
do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'radio69-show-reminders-every-minute'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'radio69-show-reminders-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://zmejdydtgxotkscluqlo.supabase.co/functions/v1/radio69-show-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey',
          (select decrypted_secret from vault.decrypted_secrets where name = 'radio69_supabase_secret_key'),
        'x-radio69-cron-secret',
          (select decrypted_secret from vault.decrypted_secrets where name = 'radio69_cron_secret')
      ),
      body := jsonb_build_object('source', 'supabase-cron'),
      timeout_milliseconds := 10000
    ) as request_id;
  $$
);
