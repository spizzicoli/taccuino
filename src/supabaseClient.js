// ============================================================
// Client Supabase per "Il mio taccuino" (versione ibrida)
// ============================================================
// Incolla qui sotto URL e chiave "anon" del tuo progetto:
// Supabase → Project Settings → API
const SUPABASE_URL = 'https://riywpzowbnyrntuapmek.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeXdwem93Ym55cm50dWFwbWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MjU4ODcsImV4cCI6MjEwNDUwMTg4N30.6n8j-ye91Ksgld5vM543KyUXdo55y1Cl8sBsmtymetU';

if(SUPABASE_URL.startsWith('INCOLLA_QUI') || SUPABASE_ANON_KEY.startsWith('INCOLLA_QUI')){
  const msg = 'Configurazione mancante: apri www/supabaseClient.js e sostituisci SUPABASE_URL e SUPABASE_ANON_KEY con i valori del tuo progetto Supabase (Project Settings → API). Poi ricarica la pagina con un refresh forzato.';
  document.addEventListener('DOMContentLoaded', () => {
    const box = document.getElementById('lockScreen');
    if(box){ box.classList.add('active'); box.innerHTML = `<div class="lock-box"><h2>Configurazione mancante</h2><div class="sub">${msg}</div></div>`; }
  });
  throw new Error(msg);
}

// La libreria supabase-js viene caricata come <script> in index.html,
// quindi qui usiamo semplicemente window.supabase.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Autenticazione (email + password) ----------
async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  return { data, error };
}
async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { data, error };
}
async function signOut() {
  await sb.auth.signOut();
}
async function getSession() {
  const { data } = await sb.auth.getSession();
  return data ? data.session : null;
}
async function resetPasswordForEmail(email) {
  return sb.auth.resetPasswordForEmail(email);
}

// ============================================================
// Mappa delle entità: nome campo nell'app (camelCase) <-> nome colonna SQL (snake_case)
// Serve per convertire automaticamente in entrambe le direzioni, senza scrivere
// codice ripetitivo per ognuna delle 18 tabelle.
// ============================================================
const ENTITY_CONFIG = {
  health:        { table: 'health',           fields: { cat:'cat', title:'title', date:'date', nextDate:'next_date', desc:'description', med:'med', cost:'cost', recurMonths:'recur_months', tags:'tags', files:'files' } },
  bills:         { table: 'bills',             fields: { provider:'provider', frequency:'frequency', amount:'amount', method:'method', nextDue:'next_due' } },
  homeTasks:     { table: 'home_tasks',        fields: { title:'title', status:'status', priority:'priority', note:'note', cost:'cost', tags:'tags', archived:'archived' } },
  installments:  { table: 'installments',      fields: { title:'title', totalAmount:'total_amount', installmentAmount:'installment_amount', totalCount:'total_count', paidCount:'paid_count', nextDue:'next_due', frequency:'frequency' } },
  expenses:      { table: 'expenses',          fields: { sourceKey:'source_key', title:'title', amount:'amount', date:'date', category:'category', tags:'tags' } },
  cars:          { table: 'cars',              fields: { name:'name', plate:'plate', model:'model', year:'year', km:'km', startKm:'start_km', lastServiceKm:'last_service_km', serviceIntervalKm:'service_interval_km', archived:'archived' } },
  carEvents:     { table: 'car_events',        fields: { carId:'car_id', type:'type', date:'date', note:'note', cost:'cost', tags:'tags' } },
  events:        { table: 'events',            fields: { title:'title', date:'date', time:'time', note:'note', recur:'recur', category:'category', linkedFrom:'linked_from' } },
  homeDocuments: { table: 'home_documents',    fields: { title:'title', category:'category', note:'note', tags:'tags', files:'files' } },
  personalDocs:  { table: 'personal_docs',     fields: { type:'type', title:'title', number:'number', expiryDate:'expiry_date', note:'note', tags:'tags', files:'files' } },
  contacts:      { table: 'contacts',          fields: { name:'name', category:'category', phone:'phone', note:'note' } },
  medicines:     { table: 'medicines',         fields: { name:'name', expiryDate:'expiry_date', note:'note', tags:'tags' } },
  seasonalTasks: { table: 'seasonal_tasks',    fields: { title:'title', month:'month', note:'note', lastDoneYear:'last_done_year' } },
  assets:        { table: 'assets',            fields: { name:'name', purchasePrice:'purchase_price', purchaseDate:'purchase_date', note:'note' } },
};
// Entità "speciali", annidate dentro state in modo diverso da un array diretto:
const ROUTINES_CONFIG = { table: 'wellness_routines', fields: { category:'category', label:'label', scheduleType:'schedule_type', intervalMinutes:'interval_minutes', activeStart:'active_start', activeEnd:'active_end', time:'time', enabled:'enabled', color:'color', lastFiredAt:'last_fired_at', lastFiredDate:'last_fired_date', doneDates:'done_dates' } };
const TRASH_CONFIG = { table: 'trash', fields: { type:'type', data:'data', label:'label', deletedAt:'deleted_at' } };
const LOG_CONFIG = { table: 'activity_log', fields: { ts:'ts', action:'action', type:'type', label:'label' } };

function toSqlRow(cfg, obj, userId){
  const row = { id: obj.id, user_id: userId };
  for(const [js, sql] of Object.entries(cfg.fields)){
    const v = obj[js];
    // Una stringa vuota ("") non è una data né un numero validi per Postgres:
    // la trattiamo come "nessun valore" (null), qualunque sia il tipo di colonna.
    row[sql] = (v === undefined || v === '') ? null : v;
  }
  return row;
}
function fromSqlRow(cfg, row){
  const obj = { id: row.id };
  for(const [js, sql] of Object.entries(cfg.fields)){
    obj[js] = row[sql] === null ? '' : row[sql];
  }
  return obj;
}

// ---------- Lettura: ricostruisce lo stesso "state" che l'app usa già ----------
async function fetchAllTables(){
  const session = await getSession();
  if(!session) throw new Error('Non autenticato.');
  const userId = session.user.id;

  const entityKeys = Object.keys(ENTITY_CONFIG);
  const queries = entityKeys.map(k => sb.from(ENTITY_CONFIG[k].table).select('*').eq('user_id', userId));
  queries.push(sb.from(ROUTINES_CONFIG.table).select('*').eq('user_id', userId));
  queries.push(sb.from(TRASH_CONFIG.table).select('*').eq('user_id', userId));
  queries.push(sb.from(LOG_CONFIG.table).select('*').eq('user_id', userId).order('ts', {ascending:false}).limit(300));
  queries.push(sb.from('profiles').select('*').eq('id', userId).maybeSingle());

  const results = await Promise.all(queries);
  results.forEach(r => { if(r.error) throw r.error; });

  const state = {};
  entityKeys.forEach((k, i) => {
    state[k] = (results[i].data || []).map(row => fromSqlRow(ENTITY_CONFIG[k], row));
  });
  const routinesRes = results[entityKeys.length];
  const trashRes = results[entityKeys.length+1];
  const logRes = results[entityKeys.length+2];
  const profileRes = results[entityKeys.length+3];

  state.wellness = { routines: (routinesRes.data||[]).map(row=>fromSqlRow(ROUTINES_CONFIG,row)), notificationsAsked:false };
  state.trash = (trashRes.data||[]).map(row=>fromSqlRow(TRASH_CONFIG,row));
  state.activityLog = (logRes.data||[]).map(row=>fromSqlRow(LOG_CONFIG,row));

  let profile = profileRes.data;
  if(!profile){
    // Rete di sicurezza: se per qualche motivo il profilo non esiste ancora, lo creo ora.
    const { data: created } = await sb.from('profiles').insert({ id: userId }).select().single();
    profile = created;
  }
  state.homeInfo = { street: profile.home_street||'', city: profile.home_city||'', cap: profile.home_cap||'', note: profile.home_note||'' };
  state.settings = {
    ownerName: profile.owner_name||'', theme: profile.theme||'light',
    reminderDaysAhead: profile.reminder_days_ahead||3, autoLockMinutes: profile.auto_lock_minutes||10,
    pin: profile.pin||'0584', pinEnabled: !!profile.pin_enabled, budgets: profile.budgets||{},
    onboardingDone: !!profile.onboarding_done, reminderEmail: profile.reminder_email||'',
    lastBriefingShown: profile.last_briefing_shown||''
  };
  return state;
}

// ---------- Scrittura: confronta con l'ultimo stato sincronizzato e scrive solo le differenze ----------
function diffArrays(newArr, oldArr){
  const oldMap = new Map((oldArr||[]).map(x=>[x.id,x]));
  const newMap = new Map((newArr||[]).map(x=>[x.id,x]));
  const added = [], changed = [], removedIds = [];
  for(const [id, item] of newMap){
    if(!oldMap.has(id)) added.push(item);
    else if(JSON.stringify(oldMap.get(id)) !== JSON.stringify(item)) changed.push(item);
  }
  for(const id of oldMap.keys()){ if(!newMap.has(id)) removedIds.push(id); }
  return { added, changed, removedIds };
}
async function syncEntity(cfg, newArr, oldArr, userId){
  const { added, changed, removedIds } = diffArrays(newArr, oldArr);
  if(added.length){
    const rows = added.map(item => toSqlRow(cfg, item, userId));
    const { error } = await sb.from(cfg.table).insert(rows);
    if(error) throw error;
  }
  if(changed.length){
    await Promise.all(changed.map(item => {
      const row = toSqlRow(cfg, item, userId);
      delete row.id; delete row.user_id;
      return sb.from(cfg.table).update(row).eq('id', item.id).then(({error})=>{ if(error) throw error; });
    }));
  }
  if(removedIds.length){
    const { error } = await sb.from(cfg.table).delete().in('id', removedIds);
    if(error) throw error;
  }
}
async function syncStateToTables(newState, oldState){
  const session = await getSession();
  if(!session) throw new Error('Non autenticato.');
  const userId = session.user.id;
  oldState = oldState || {};

  const jobs = Object.keys(ENTITY_CONFIG).map(k =>
    syncEntity(ENTITY_CONFIG[k], newState[k]||[], oldState[k]||[], userId)
  );
  jobs.push(syncEntity(ROUTINES_CONFIG, (newState.wellness||{}).routines||[], (oldState.wellness||{}).routines||[], userId));
  jobs.push(syncEntity(TRASH_CONFIG, newState.trash||[], oldState.trash||[], userId));
  jobs.push(syncEntity(LOG_CONFIG, newState.activityLog||[], oldState.activityLog||[], userId));

  // Il profilo (impostazioni + indirizzo di casa) è una riga sola: la aggiorniamo sempre,
  // costa pochissimo e ci evita di dover diffare un oggetto singolo.
  const s = newState.settings||{}, h = newState.homeInfo||{};
  jobs.push(sb.from('profiles').update({
    owner_name: s.ownerName||'', theme: s.theme||'light',
    reminder_days_ahead: s.reminderDaysAhead||3, auto_lock_minutes: s.autoLockMinutes||10,
    pin: s.pin||'0584', pin_enabled: !!s.pinEnabled, budgets: s.budgets||{},
    onboarding_done: !!s.onboardingDone, reminder_email: s.reminderEmail||'',
    last_briefing_shown: s.lastBriefingShown || null,
    home_street: h.street||'', home_city: h.city||'', home_cap: h.cap||'', home_note: h.note||''
  }).eq('id', userId).then(({error})=>{ if(error) throw error; }));

  await Promise.all(jobs);
}

// ---------- Migrazione automatica dalla vecchia tabella unica "app_state" ----------
// Se in passato avevi usato la versione con un unico blocco JSON, questa funzione
// travasa quei dati nelle tabelle nuove la prima volta che serve (non tocca nulla
// se le tabelle nuove hanno già dei dati).
async function migrateFromBlobIfNeeded(currentState){
  const alreadyHasData = Object.keys(ENTITY_CONFIG).some(k => (currentState[k]||[]).length>0)
    || (currentState.wellness && currentState.wellness.routines && currentState.wellness.routines.length>0);
  if(alreadyHasData) return currentState;

  const session = await getSession();
  if(!session) return currentState;
  const { data: blobRow } = await sb.from('app_state').select('data').eq('user_id', session.user.id).maybeSingle();
  if(!blobRow || !blobRow.data) return currentState;
  const blob = blobRow.data;
  const blobHasData = Object.keys(ENTITY_CONFIG).some(k => (blob[k]||[]).length>0)
    || (blob.wellness && blob.wellness.routines && blob.wellness.routines.length>0);
  if(!blobHasData) return currentState;

  await syncStateToTables(blob, {});
  // riporto anche nome/indirizzo/impostazioni dal blob, se presenti
  if(blob.settings || blob.homeInfo){
    await syncStateToTables({ settings: blob.settings||{}, homeInfo: blob.homeInfo||{} }, {});
  }
  return await fetchAllTables();
}

// ---------- Allegati (foto/PDF) su Supabase Storage ----------
async function uploadAttachment(file) {
  const session = await getSession();
  if (!session) throw new Error('Non autenticato.');
  const path = `${session.user.id}/${Date.now()}-${file.name}`;
  const { error } = await sb.storage.from('attachments').upload(path, file);
  if (error) throw error;
  return { name: file.name, path };
}
async function getAttachmentUrl(path) {
  // "signed URL" valido 1 ora, dato che il bucket è privato
  const { data, error } = await sb.storage.from('attachments').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
async function deleteAttachment(path) {
  await sb.storage.from('attachments').remove([path]);
}

window.taccuinoDB = {
  sb, signUp, signIn, signOut, getSession, resetPasswordForEmail,
  fetchAllTables, syncStateToTables, migrateFromBlobIfNeeded,
  uploadAttachment, getAttachmentUrl, deleteAttachment
};
