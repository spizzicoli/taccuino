let state = {
  health: [], homeInfo:{street:'',city:'',cap:'',note:''},
  bills: [], homeTasks: [], installments: [],
  expenses: [], cars: [], carEvents: [], events: [], homeDocuments: [],
  personalDocs: [], contacts: [], medicines: [], seasonalTasks: [], assets: [],
  trash: [], activityLog: [],
  settings: { reminderDaysAhead: 3, theme: 'light', pin:'0584', pinEnabled:false, autoLockMinutes:10, budgets:{}, onboardingDone:false, lastBriefingShown:'' }
};
let activeTab = 'home';
let calMode = 'month';
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let weekRef = new Date();
let selectedDay = null;
let searchQuery = '';
let unlocked = false;
let showArchivedTasks = false;
let showArchivedCars = false;
let undoStack = [];
const MAX_UNDO = 20;
const EVENT_CATS = ['Salute','Lavoro','Famiglia','Sport','Altro'];
const EVENT_CAT_COLORS = { Salute:'#D9718C', Lavoro:'#4E7DA0', Famiglia:'#C99A2E', Sport:'#7FA06F', Altro:'#87619B', Amministrazione:'#8A8074' };
function eventColor(e){ return e.linkedFrom ? EVENT_CAT_COLORS.Amministrazione : (EVENT_CAT_COLORS[e.category||'Altro'] || EVENT_CAT_COLORS.Altro); }
let chartMonthly = null, chartCategory = null, chartYearly = null;

const uid = () => Math.random().toString(36).slice(2,10);
const todayStr = () => new Date().toISOString().slice(0,10);
const fmtD = (d) => { if(!d) return ''; const dt=new Date(d+'T00:00'); return dt.toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'}); };
const fmtDT = (iso) => { const d=new Date(iso); return d.toLocaleDateString('it-IT',{day:'numeric',month:'short'}) + ' ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); };
const euro = (n) => (Number(n)||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
function parseTags(s){ return (s||'').split(',').map(t=>t.trim()).filter(Boolean); }
function tagsChips(tags){ if(!tags||!tags.length) return ''; return `<div class="tags-row">${tags.map(t=>`<span class="tag chip-label" onclick="filterByTag('${esc(t)}')">#${esc(t)}</span>`).join('')}</div>`; }

const TYPE_LABELS = { health:'Salute', bill:'Bolletta', homeTask:'Lavoro casa', installment:'Rata', homeDocument:'Documento casa', personalDoc:'Documento personale', contact:'Contatto', car:'Auto', carEvent:'Evento auto', event:'Calendario', expense:'Spesa', medicine:'Farmaco', seasonalTask:'Manutenzione stagionale', asset:'Bene', profile:'Profilo', routine:'Routine benessere' };
const ACTION_LABELS = { added:'Aggiunto', edited:'Modificato', deleted:'Eliminato', restored:'Ripristinato', archived:'Archiviato' };

// ---------- icone ----------
const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19v-5h4v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  health: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20s-7.2-4.6-9.5-9.1C1 7.6 2.6 4.5 5.8 4c2-.3 3.6.7 4.7 2.2C11.6 4.7 13.2 3.7 15.2 4c3.2.5 4.8 3.6 3.3 6.9C16.2 15.4 12 20 12 20Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 11h2.2l1.1-2 1.6 4 1.1-2H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  house: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 19v-4.2c0-.9.7-1.6 1.6-1.6h1.8c.9 0 1.6.7 1.6 1.6V19" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  piggy: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12.5c0-3.3 3-6 7-6 1 0 2 .2 2.8.5.5-.7 1.4-1.1 2.4-1v2.3c.5.4.8.9 1 1.4H19v2.6h-1c-.3 1-1 1.9-2 2.6v2.1h-2.2v-1.2c-.6.1-1.2.2-1.8.2s-1.2-.1-1.8-.2v1.2H8v-2c-1.8-1-3-2.8-3-4.9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="14.7" cy="10.3" r=".9" fill="currentColor"/><path d="M5 12c-.8 0-1.6-.5-2-1.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 15.5V13l1.6-4.2A2 2 0 0 1 7.5 7.5h9a2 2 0 0 1 1.9 1.3L20 13v2.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4 15.5h16v2.3a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1V17H7.2v.8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7.5" cy="15.3" r="1.3" stroke="currentColor" stroke-width="1.4"/><circle cx="16.5" cy="15.3" r="1.3" stroke="currentColor" stroke-width="1.4"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5.5" width="16" height="14" rx="2.2" stroke="currentColor" stroke-width="1.7"/><path d="M4 9.5h16" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 3.5v3M15.5 3.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="8.6" cy="13.2" r="1" fill="currentColor"/><circle cx="12" cy="13.2" r="1" fill="currentColor"/><circle cx="15.4" cy="13.2" r="1" fill="currentColor"/><circle cx="8.6" cy="16.4" r="1" fill="currentColor"/><circle cx="12" cy="16.4" r="1" fill="currentColor"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5V7a1 1 0 0 0 1 1h3.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12h6M9 15h6M9 9h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  admin: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="3.5" width="16" height="17" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M19.4 13.3c.05-.45.05-.9 0-1.35l1.5-1.15-1.5-2.5-1.8.45c-.35-.3-.75-.55-1.2-.75L15.9 6h-3l-.5 1.95c-.45.2-.85.45-1.2.75l-1.8-.45-1.5 2.5 1.5 1.15c-.05.45-.05.9 0 1.35l-1.5 1.15 1.5 2.5 1.8-.45c.35.3.75.55 1.2.75L12.9 20h3l.5-1.95c.45-.2.85-.45 1.2-.75l1.8.45 1.5-2.5-1.5-1.15Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 14.2A8.3 8.3 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  print: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 8.5V4h10v4.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><rect x="4.5" y="8.5" width="15" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.7"/><path d="M7 14h10v6H7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="1.7"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8H15.5a4.5 4.5 0 0 1 0 9H10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4.5 5.5 8 9 11.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  briefing: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6.5" width="13.5" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 4v5M13.5 4v5M4 10.5h13.5M7.5 14h6M7.5 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="18.2" cy="6.2" r="3.2" fill="var(--c-calendario-soft)" stroke="currentColor" stroke-width="1.3"/><path d="M18.2 4.7v1.7l1.1.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  wand: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 19 17 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M14 4.5v2M17.5 6l-1.4 1.4M20.5 9.5h-2M7 15v2M4.5 18.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="3.5" width="6" height="10" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5M9 20.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  droplet: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.5s6 6.8 6 11a6 6 0 1 1-12 0c0-4.2 6-11 6-11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.8 2.8M15.2 15.2 18 18M18 6l-2.8 2.8M8.8 15.2 6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
};
function sectionIcon(key, color, soft){ return `<div class="section-icon" style="background:${soft};color:${color};">${ICONS[key]}</div>`; }

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

// ---------- persistenza ----------
let isOffline = false;
let aiAvailable = false;
const AI_CONFIG_KEY = 'taccuino-ai-config-v1';
const AI_DEFAULTS = {provider:'gpt', endpoint:'https://api.openai.com/v1/chat/completions', model:'gpt-4o-mini', apiKey:''};
let aiConfig = {...AI_DEFAULTS};
function loadAIConfig(){
  try{ aiConfig = {...AI_DEFAULTS, ...JSON.parse(localStorage.getItem(AI_CONFIG_KEY)||'{}')}; }
  catch(e){ aiConfig = {...AI_DEFAULTS}; }
  aiAvailable = Boolean(aiConfig.endpoint && aiConfig.model && aiConfig.apiKey);
}
async function checkAIStatus(){
  loadAIConfig();
  aiAvailable = Boolean(aiConfig.endpoint && aiConfig.model && aiConfig.apiKey);
}
let pendingSync = false;
let lastSyncedState = null;
const OFFLINE_CACHE_KEY = 'taccuino-offline-cache-v1';

function isAutomaticBill(bill){
  return /addebito|automatic|domicilia|rid|sepa/i.test(bill.method||'');
}
function processScheduledBillPayments(){
  const today = todayStr();
  let changed = false;
  state.bills.forEach(bill=>{
    if(!isAutomaticBill(bill) || !bill.nextDue || Number(bill.amount)<=0) return;
    let guard = 0;
    while(bill.nextDue <= today && guard++ < 120){
      const sourceKey = `bill-auto-${bill.id}-${bill.nextDue}`;
      if(!state.expenses.some(expense=>expense.sourceKey===sourceKey)){
        addExpense(sourceKey, 'Pagamento '+bill.provider, bill.amount, bill.nextDue, 'Bollette');
      }
      bill.nextDue = addPeriod(bill.nextDue, bill.frequency||'Mensile');
      syncLinkedEvent('bill-due-'+bill.id, bill.nextDue, 'Scadenza '+bill.provider, 'Bolletta · '+euro(bill.amount));
      changed = true;
    }
  });
  return changed;
}
async function runScheduledBillPayments(){
  if(!unlocked || !processScheduledBillPayments()) return;
  await saveState();
  toast('Addebiti automatici aggiornati nello storico.');
}
setInterval(runScheduledBillPayments, 60000);

async function loadState(){
  let loadedFromServer = false;
  try{
    let data = await taccuinoDB.fetchAllTables();
    data = await taccuinoDB.migrateFromBlobIfNeeded(data);
    state = Object.assign(state, data);
    lastSyncedState = JSON.parse(JSON.stringify(data));
    loadedFromServer = true;
    isOffline = false;
  }catch(e){
    console.error('Errore nel caricamento da Supabase:', e);
    isOffline = true;
    try{
      const cached = localStorage.getItem(OFFLINE_CACHE_KEY);
      if(cached){ state = Object.assign(state, JSON.parse(cached)); toast('Sei offline: vedi l\u2019ultima copia salvata su questo dispositivo.'); }
      else { toast('Impossibile contattare il server e nessuna copia offline disponibile su questo dispositivo.'); }
    }catch(e2){ toast('Impossibile leggere la copia offline.'); }
    if(!lastSyncedState) lastSyncedState = {};
  }
  if(!state.settings) state.settings = {};
  if(state.settings.reminderDaysAhead===undefined) state.settings.reminderDaysAhead = 3;
  if(!state.settings.theme) state.settings.theme = 'light';
  if(state.settings.pin===undefined) state.settings.pin = '0584';
  if(state.settings.pinEnabled===undefined) state.settings.pinEnabled = false;
  if(state.settings.autoLockMinutes===undefined) state.settings.autoLockMinutes = 10;
  if(!state.settings.budgets) state.settings.budgets = {};
  if(!state.homeDocuments) state.homeDocuments = [];
  if(!state.personalDocs) state.personalDocs = [];
  if(!state.contacts) state.contacts = [];
  if(!state.trash) state.trash = [];
  if(!state.activityLog) state.activityLog = [];
  if(state.settings.onboardingDone===undefined) state.settings.onboardingDone = false;
  if(state.settings.lastBriefingShown===undefined) state.settings.lastBriefingShown = '';
  if(state.settings.ownerName===undefined) state.settings.ownerName = '';
  if(state.settings.reminderEmail===undefined) state.settings.reminderEmail = '';
  if(!state.medicines) state.medicines = [];
  if(!state.seasonalTasks) state.seasonalTasks = [];
  if(!state.assets) state.assets = [];
  if(!state.wellness) state.wellness = { routines: [], notificationsAsked:false };
  let plannedTaskExpensesRemoved = false;
  state.homeTasks.forEach(task=>{
    if(task.status!=='Completato' && state.expenses.some(expense=>expense.sourceKey==='task-'+task.id)){
      removeExpense('task-'+task.id); plannedTaskExpensesRemoved = true;
    }
  });
  if(loadedFromServer) cacheStateOffline();
  if(plannedTaskExpensesRemoved) await saveState();
  purgeOldTrash();
  const automaticPaymentsAdded = processScheduledBillPayments();
  if(automaticPaymentsAdded){ cacheStateOffline(); await saveState(); }
  applyTheme();
  loadAIConfig();
  // L'accesso vero è già garantito da Supabase (email+password). Il PIN qui diventa un
  // livello extra opzionale di "rilocchetto rapido" (utile se presti il telefono a qualcuno),
  // non è più la porta d'ingresso principale come nella versione per PC.
  if(state.settings.pinEnabled && state.settings.pin){ showLock(); }
  else { unlocked = true; document.getElementById('app').style.display=''; render(); maybeShowOnboarding(); maybeShowBriefing(); startWellnessEngine(); checkAIStatus(); }
}
function cacheStateOffline(){
  try{ localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(state)); }catch(e){ /* storage piena o non disponibile: ignoro */ }
}
async function saveState(){
  try{
    await taccuinoDB.syncStateToTables(state, lastSyncedState);
    lastSyncedState = JSON.parse(JSON.stringify(state));
    isOffline = false; pendingSync = false;
    cacheStateOffline();
  }catch(e){
    console.error('Errore nel salvataggio su Supabase:', e);
    isOffline = true; pendingSync = true;
    cacheStateOffline();
    toast('Sei offline: la modifica è salvata solo su questo dispositivo e si sincronizzerà alla riconnessione.');
  }
  if(unlocked) render();
}
async function trySyncIfOffline(){
  if(!pendingSync) return;
  try{
    await taccuinoDB.syncStateToTables(state, lastSyncedState);
    lastSyncedState = JSON.parse(JSON.stringify(state));
    isOffline = false; pendingSync = false;
    toast('Riconnesso: le modifiche sono state sincronizzate con il server.');
    if(unlocked) render();
  }catch(e){ /* ancora offline, ritento più tardi */ }
}
setInterval(trySyncIfOffline, 20000);

// ---------- Autenticazione (email + password, tramite Supabase) ----------
async function initApp(){
  try{
    const session = await taccuinoDB.getSession();
    if(session){ await loadState(); return; }
  }catch(e){ /* nessuna sessione valida: mostro il login */ }
  showAuthScreen('login');
}
function showAuthScreen(mode){
  const box = document.getElementById('lockScreen');
  document.getElementById('app').style.display='none';
  box.classList.add('active');
  const isSignup = mode==='signup';
  box.innerHTML = `
    <div class="lock-box">
      <h2>${isSignup?'Crea il tuo account':'Bentornato'}</h2>
      <div class="sub">${isSignup?'Bastano email e password: i tuoi dati saranno solo tuoi.':'Accedi con la tua email per continuare'}</div>
      <input class="pin-input" id="auth_email" type="email" placeholder="Email" style="letter-spacing:normal;font-size:15px;text-align:left;padding-left:14px;">
      <input class="pin-input" id="auth_password" type="password" placeholder="Password" style="letter-spacing:normal;font-size:15px;text-align:left;padding-left:14px;">
      <div id="authError" class="notice" style="display:none;margin-bottom:12px;"></div>
      <button class="btn primary" style="width:100%;margin-bottom:10px;" onclick="handleAuthSubmit('${mode}')">${isSignup?'Registrati':'Accedi'}</button>
      <button class="link-toggle" onclick="showAuthScreen('${isSignup?'login':'signup'}')">${isSignup?'Hai già un account? Accedi':'Non hai un account? Registrati'}</button>
    </div>`;
  const pwInput = document.getElementById('auth_password');
  pwInput.addEventListener('keyup', (e)=>{ if(e.key==='Enter') handleAuthSubmit(mode); });
}
async function handleAuthSubmit(mode){
  const email = val('auth_email').trim();
  const password = val('auth_password');
  const errBox = document.getElementById('authError');
  errBox.style.display='none';
  if(!email || !password){ errBox.textContent='Inserisci email e password.'; errBox.style.display='block'; return; }
  if(password.length<6){ errBox.textContent='La password deve avere almeno 6 caratteri.'; errBox.style.display='block'; return; }
  const fn = mode==='signup' ? taccuinoDB.signUp : taccuinoDB.signIn;
  const { data, error } = await fn(email, password);
  if(error){ errBox.textContent = error.message; errBox.style.display='block'; return; }
  if(mode==='signup' && !data.session){
    errBox.className='notice';
    errBox.textContent = 'Account creato! Controlla la tua email per confermarlo, poi torna qui ad accedere.';
    errBox.style.display='block';
    return;
  }
  document.getElementById('lockScreen').classList.remove('active');
  await loadState();
}
async function logout(){
  await taccuinoDB.signOut();
  unlocked = false;
  location.reload();
}
function applyTheme(){ document.documentElement.setAttribute('data-theme', state.settings.theme || 'light'); }
function toggleTheme(){ state.settings.theme = (state.settings.theme==='dark') ? 'light' : 'dark'; applyTheme(); saveState(); }

// ---------- PIN + blocco automatico ----------
function showLock(){
  const lock = document.getElementById('lockScreen');
  document.getElementById('app').style.display='none';
  lock.classList.add('active');
  lock.innerHTML = `
    <div class="lock-box">
      <div style="margin-bottom:10px;"><div class="section-icon" style="background:var(--c-calendario-soft);color:var(--c-calendario);margin:0 auto;">${ICONS.lock}</div></div>
      <h2>Bentornato</h2>
      <div class="sub">Inserisci il PIN a 4 cifre per accedere al tuo taccuino</div>
      <input class="pin-input" id="pinInput" type="password" inputmode="numeric" maxlength="4" autofocus>
      <button class="btn primary" style="width:100%;" onclick="checkPin()">Sblocca</button>
    </div>`;
  const input = document.getElementById('pinInput');
  input.addEventListener('keyup', (e)=>{ if(e.key==='Enter') checkPin(); if(input.value.length===4) checkPin(); });
}
function checkPin(){
  const input = document.getElementById('pinInput');
  const entered = input.value;
  if(entered === state.settings.pin){
    unlocked = true;
    document.getElementById('lockScreen').classList.remove('active');
    document.getElementById('app').style.display='';
    window._lastActivity = Date.now();
    render();
    maybeShowOnboarding();
    maybeShowBriefing();
    startWellnessEngine();
    checkAIStatus();
  } else {
    input.classList.add('shake'); input.value='';
    setTimeout(()=>input.classList.remove('shake'), 400);
    toast('PIN errato.');
  }
}
function setupAutoLock(){
  ['click','keydown','mousemove','touchstart'].forEach(evt=>document.addEventListener(evt, ()=>{ window._lastActivity = Date.now(); }, {passive:true}));
  window._lastActivity = Date.now();
  setInterval(()=>{
    if(!unlocked) return;
    const mins = state.settings.autoLockMinutes||0;
    if(mins>0 && (Date.now()-window._lastActivity) > mins*60000){ unlocked=false; showLock(); }
  }, 20000);
}
function quickUpdateSetting(key, value){
  pushUndo(); state.settings[key]=value; saveState(); toast('Impostazione aggiornata.'); }
function quickSetTheme(v){ state.settings.theme=v; applyTheme(); saveState(); }
function changePinFromSettings(){
  pushUndo();
  const v = val('set_newPin'); if(!v) return;
  if(!/^\d{4}$/.test(v)){ alert('Il PIN deve essere di 4 cifre numeriche.'); return; }
  state.settings.pin = v; saveState(); toast('PIN aggiornato.');
}
const AI_PROVIDER_DEFAULTS = {
  gpt: {endpoint:'https://api.openai.com/v1/chat/completions', model:'gpt-4o-mini'},
  copilot: {endpoint:'https://models.inference.ai.azure.com/chat/completions', model:'gpt-4o-mini'},
  claude: {endpoint:'https://api.anthropic.com/v1/messages', model:'claude-3-5-haiku-latest'},
  gemini: {endpoint:'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model:'gemini-2.0-flash'},
  mistral: {endpoint:'https://api.mistral.ai/v1/chat/completions', model:'mistral-small-latest'},
  grok: {endpoint:'https://api.x.ai/v1/chat/completions', model:'grok-3-mini'},
  custom: {endpoint:'', model:''}
};
function updateAIProvider(provider){
  const defaults = AI_PROVIDER_DEFAULTS[provider] || AI_PROVIDER_DEFAULTS.custom;
  const endpoint = document.getElementById('set_aiEndpoint');
  const model = document.getElementById('set_aiModel');
  if(endpoint) endpoint.value = defaults.endpoint;
  if(model) model.value = defaults.model;
}
function saveAIConfig(){
  aiConfig = {
    provider: val('set_aiProvider'),
    endpoint: val('set_aiEndpoint').trim(),
    model: val('set_aiModel').trim(),
    apiKey: val('set_aiKey').trim()
  };
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
  aiAvailable = Boolean(aiConfig.endpoint && aiConfig.model && aiConfig.apiKey);
  toast(aiAvailable ? 'Provider AI collegato su questo dispositivo.' : 'Completa provider, endpoint, modello e chiave API.');
  render();
}

function maybeShowOnboarding(){
  if(!state.settings.onboardingDone){ setTimeout(openOnboardingWizard, 300); }
}
function openOnboardingWizard(){
  openModal(`
    <h3>Benvenuto nel tuo taccuino 🌿</h3>
    <div class="section-label">Due minuti per impostare le basi. Potrai sempre modificare tutto in seguito.</div>
    <div class="field"><label>Come ti chiami?</label><input id="ob_name" placeholder="Il tuo nome" value="${esc(state.settings.ownerName||'')}"></div>
    <div class="field"><label>Indirizzo di casa (opzionale)</label><input id="ob_street" placeholder="Via e numero"></div>
    <div class="field-row">
      <div class="field"><label>Città</label><input id="ob_city"></div>
      <div class="field"><label>CAP</label><input id="ob_cap"></div>
    </div>
    <div class="field"><label>PIN di accesso (4 cifre)</label><input id="ob_pin" maxlength="4" inputmode="numeric" value="${esc(state.settings.pin||'0584')}"></div>
    <div class="field"><label>Email per i promemoria (opzionale)</label><input id="ob_email" type="email" placeholder="tuo.indirizzo@email.it" value="${esc(state.settings.reminderEmail||'')}"></div>
    <div class="notice">L'invio vero e proprio delle email non è ancora attivo in questa versione ibrida (arriverà con un prossimo aggiornamento). L'indirizzo che scrivi qui verrà usato quando sarà pronto — puoi cambiarlo quando vuoi da Impostazioni.</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="skipOnboarding()">Salta</button>
      <button class="btn primary" onclick="finishOnboarding()">Inizia</button>
    </div>
  `);
}
function skipOnboarding(){
  state.settings.onboardingDone = true;
  closeModal(); saveState();
}
function finishOnboarding(){
  const name = val('ob_name'), street = val('ob_street'), city = val('ob_city'), cap = val('ob_cap'), pin = val('ob_pin'), email = val('ob_email');
  if(name) state.settings.ownerName = name;
  if(street || city || cap) state.homeInfo = {...state.homeInfo, street, city, cap};
  if(/^\d{4}$/.test(pin)) state.settings.pin = pin;
  if(email) state.settings.reminderEmail = email;
  state.settings.onboardingDone = true;
  closeModal(); saveState(); toast('Tutto pronto!');
}

async function sendRemindersNow(){
  toast('I promemoria via email non sono ancora attivi in questa versione ibrida — arriveranno con un prossimo aggiornamento (richiedono una funzione lato Supabase). Nel frattempo trovi tutto in "Prossime scadenze".');
}

// ---------- cestino + registro attività ----------
function logActivity(action, type, label){
  state.activityLog = state.activityLog || [];
  state.activityLog.unshift({id:uid(), ts:new Date().toISOString(), action, type, label});
  if(state.activityLog.length>300) state.activityLog.length = 300;
}
function trashItem(type, item, label){
  state.trash.push({id:uid(), type, data: JSON.parse(JSON.stringify(item)), deletedAt: todayStr(), label});
  logActivity('deleted', type, label);
}
function purgeOldTrash(){
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-30);
  state.trash = (state.trash||[]).filter(t=> new Date((t.deletedAt||todayStr())+'T00:00') >= cutoff);
}
function restoreFromTrash(trashId){
  pushUndo();
  const t = state.trash.find(x=>x.id===trashId); if(!t) return;
  switch(t.type){
    case 'health': state.health.push(t.data); upsertExpense('health-'+t.data.id, t.data.title||t.data.cat, t.data.cost, t.data.date, 'Salute'); syncLinkedEvent('health-next-'+t.data.id, t.data.nextDate, t.data.title||t.data.cat, 'Controllo salute · '+t.data.cat); break;
    case 'bill': state.bills.push(t.data); syncLinkedEvent('bill-due-'+t.data.id, t.data.nextDue, 'Scadenza '+t.data.provider, 'Bolletta · '+euro(t.data.amount)); break;
    case 'homeTask': state.homeTasks.push(t.data); if(t.data.status==='Completato') upsertExpense('task-'+t.data.id, t.data.title, t.data.cost, t.data.completedDate||todayStr(), 'Lavori casa'); break;
    case 'installment': state.installments.push(t.data); syncLinkedEvent('inst-due-'+t.data.id, t.data.nextDue, 'Rata '+t.data.title, 'Rata · '+euro(t.data.installmentAmount)); break;
    case 'homeDocument': state.homeDocuments.push(t.data); break;
    case 'personalDoc': state.personalDocs.push(t.data); syncLinkedEvent('persdoc-'+t.data.id, t.data.expiryDate, 'Scadenza '+(t.data.title||t.data.type), 'Documento personale'); break;
    case 'contact': state.contacts.push(t.data); break;
    case 'car': state.cars.push(t.data); break;
    case 'carEvent': { state.carEvents.push(t.data); upsertExpense('car-'+t.data.id, t.data.type, t.data.cost, t.data.date, 'Auto'); const car=state.cars.find(x=>x.id===t.data.carId); syncLinkedEvent('carevt-'+t.data.id, t.data.date, (car?car.name+' - ':'')+t.data.type, 'Auto'); break; }
    case 'event': state.events.push(t.data); break;
    case 'expense': state.expenses.push(t.data); break;
    case 'medicine': state.medicines.push(t.data); syncLinkedEvent('med-'+t.data.id, t.data.expiryDate, 'Scadenza farmaco: '+t.data.name, 'Farmacia'); break;
    case 'seasonalTask': state.seasonalTasks.push(t.data); break;
    case 'asset': state.assets.push(t.data); break;
    case 'routine': state.wellness.routines.push(t.data); break;
  }
  state.trash = state.trash.filter(x=>x.id!==trashId);
  logActivity('restored', t.type, t.label);
  saveState(); toast('Ripristinato.');
}
function permanentlyDeleteTrash(trashId){
  pushUndo(); state.trash = state.trash.filter(x=>x.id!==trashId); saveState(); }

// ---------- spese ----------
function upsertExpense(sourceKey, title, amount, date, category){
  const amt = Number(amount)||0;
  const idx = state.expenses.findIndex(e=>e.sourceKey===sourceKey);
  if(amt<=0){ if(idx>-1) state.expenses.splice(idx,1); return; }
  const entry = {id: idx>-1?state.expenses[idx].id:uid(), sourceKey, title, amount:amt, date:date||todayStr(), category};
  if(idx>-1) state.expenses[idx]=entry; else state.expenses.push(entry);
}
function addExpense(sourceKey, title, amount, date, category, tags){
  const amt = Number(amount)||0; if(amt<=0) return;
  state.expenses.push({id:uid(), sourceKey, title, amount:amt, date:date||todayStr(), category, tags:tags||[]});
}
function removeExpense(sourceKey){ state.expenses = state.expenses.filter(e=>e.sourceKey!==sourceKey); }
function confirmDelete(msg, fn){ if(confirm(msg)) fn(); }
function pushUndo(){
  try{ undoStack.push(JSON.stringify(state)); if(undoStack.length>MAX_UNDO) undoStack.shift(); }catch(e){}
}
function undoLast(){
  if(undoStack.length===0){ toast('Niente da annullare.'); return; }
  const prev = undoStack.pop();
  try{ state = JSON.parse(prev); saveState(); toast('Ultima modifica annullata.'); }
  catch(e){ toast('Impossibile annullare.'); }
}
function addPeriod(dateStr, freq){
  const map = {'Mensile':1,'Bimestrale':2,'Trimestrale':3,'Semestrale':6,'Annuale':12};
  const d = new Date(dateStr+'T00:00'); d.setMonth(d.getMonth()+(map[freq]||1));
  return d.toISOString().slice(0,10);
}
function addMonths(dateStr, months){ const d=new Date(dateStr+'T00:00'); d.setMonth(d.getMonth()+Number(months||1)); return d.toISOString().slice(0,10); }

// ---------- scadenze -> calendario ----------
function syncLinkedEvent(sourceKey, date, title, sub){
  const idx = state.events.findIndex(e=>e.linkedFrom===sourceKey);
  if(!date || date < todayStr()){ if(idx>-1) state.events.splice(idx,1); return; }
  const entry = { id: idx>-1?state.events[idx].id:uid(), title, date, time:'', note: sub||'', linkedFrom: sourceKey, recur:'none' };
  if(idx>-1) state.events[idx]=entry; else state.events.push(entry);
}
function removeLinkedEvent(sourceKey){ state.events = state.events.filter(e=>e.linkedFrom!==sourceKey); }

async function openAttachment(encodedPath){
  const path = decodeURIComponent(encodedPath);
  try{
    const url = await taccuinoDB.getAttachmentUrl(path);
    window.open(url, '_blank');
  }catch(e){ toast('Non sono riuscito ad aprire questo file.'); }
}
async function readFiles(fileList){
  const uploads = [];
  for(const f of Array.from(fileList)){
    try{ uploads.push(await taccuinoDB.uploadAttachment(f)); }
    catch(e){ console.error('Upload fallito per', f.name, e); toast(`Non sono riuscito a caricare ${f.name}.`); }
  }
  return uploads; // ogni elemento: {name, path} — il file vero sta su Supabase Storage
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(document.querySelector(`script[src="${src}"]`)){ resolve(); return; }
    const s=document.createElement('script'); s.src=src; s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Impossibile caricare '+src));
    document.head.appendChild(s);
  });
}

function nextOccurrenceDate(e){
  if(!e.date) return e.date;
  if(!e.recur || e.recur==='none') return e.date;
  const [by,bm,bd] = e.date.split('-').map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  if(e.recur==='yearly'){
    let candidate = new Date(today.getFullYear(), bm-1, bd);
    if(candidate < today) candidate = new Date(today.getFullYear()+1, bm-1, bd);
    return candidate.toISOString().slice(0,10);
  }
  if(e.recur==='monthly'){
    let candidate = new Date(today.getFullYear(), today.getMonth(), bd);
    if(candidate < today) candidate = new Date(today.getFullYear(), today.getMonth()+1, bd);
    return candidate.toISOString().slice(0,10);
  }
  return e.date;
}
function collectUpcoming(){
  const list = [];
  state.health.forEach(h=>{ if(h.nextDate) list.push({title:h.title||h.cat, sub:'Salute · '+h.cat, date:h.nextDate}); });
  state.bills.forEach(b=>{ if(b.nextDue) list.push({title:b.provider, sub:'Bolletta · '+euro(b.amount), date:b.nextDue}); });
  state.installments.forEach(i=>{ if(i.nextDue) list.push({title:i.title, sub:'Rata · '+euro(i.installmentAmount), date:i.nextDue}); });
  state.carEvents.forEach(c=>{ const car=state.cars.find(x=>x.id===c.carId); if(c.date) list.push({title:(car?car.name+' · ':'')+c.type, sub:'Auto', date:c.date}); });
  state.personalDocs.forEach(p=>{ if(p.expiryDate) list.push({title:p.title||p.type, sub:'Documento personale', date:p.expiryDate}); });
  state.medicines.forEach(m=>{ if(m.expiryDate) list.push({title:m.name, sub:'Farmaco in scadenza', date:m.expiryDate}); });
  state.events.forEach(e=>{ if(!e.linkedFrom) list.push({title:e.title, sub:'Calendario'+(e.time?(' · '+e.time):''), date: nextOccurrenceDate(e)}); });
  const now = new Date(todayStr()+'T00:00');
  return list.filter(x=>x.date).map(x=>({...x, diff: Math.round((new Date(x.date+'T00:00')-now)/86400000)}))
    .filter(x=>x.diff>=-1).sort((a,b)=>a.diff-b.diff);
}
function badgeFor(diff){
  if(diff<-3) return `<span class="due-badge overdue">⚠ scaduta da ${Math.abs(diff)}g</span>`;
  if(diff<0) return '<span class="due-badge urgent">scaduta</span>';
  if(diff<=7) return `<span class="due-badge urgent">tra ${diff}g</span>`;
  if(diff<=21) return `<span class="due-badge soon">tra ${diff}g</span>`;
  return `<span class="due-badge"></span>`;
}

// ---------- punteggio salute amministrativa ----------
function computeAdminScore(){
  let score = 100;
  const details = [];
  const overdue = collectUpcoming().filter(u=>u.diff<0);
  if(overdue.length){ score -= Math.min(40, overdue.length*8); details.push(`${overdue.length} scadenza/e in ritardo`); }
  const budgets = state.settings.budgets||{};
  const thisMonth = todayStr().slice(0,7);
  const byCatThisMonth = {};
  state.expenses.filter(e=>(e.date||'').startsWith(thisMonth)).forEach(e=>{ byCatThisMonth[e.category]=(byCatThisMonth[e.category]||0)+e.amount; });
  let overBudget = 0;
  Object.entries(budgets).forEach(([cat,limit])=>{ if((byCatThisMonth[cat]||0) > limit) overBudget++; });
  if(overBudget){ score -= Math.min(30, overBudget*10); details.push(`${overBudget} budget superato/i questo mese`); }
  const expiredDocs = [...state.personalDocs, ...state.medicines].filter(d=>d.expiryDate && d.expiryDate < todayStr());
  if(expiredDocs.length){ score -= Math.min(30, expiredDocs.length*10); details.push(`${expiredDocs.length} documento/farmaco scaduto`); }
  score = Math.max(0, Math.min(100, score));
  let label = 'Ottimo', color = 'var(--primary)';
  if(score<50){ label='Da migliorare'; color='#C0554D'; }
  else if(score<80){ label='Buono'; color='#C99A2E'; }
  return { score, label, color, details };
}

// ---------- briefing del mattino ----------
function maybeShowBriefing(){
  if(!state.settings.onboardingDone) return; // non sovrapporsi al wizard al primissimo avvio
  if(state.settings.lastBriefingShown === todayStr()) return;
  setTimeout(openBriefingModal, 350);
}
function buildBriefingHTML(){
  const upcoming = collectUpcoming();
  const urgent = upcoming.filter(u=>u.diff<=3);
  const overdue = upcoming.filter(u=>u.diff<0);
  const admin = computeAdminScore();
  const thisMonth = todayStr().slice(0,7);
  const spentThisMonth = state.expenses.filter(e=>(e.date||'').startsWith(thisMonth)).reduce((s,e)=>s+e.amount,0);
  return `
    <h3>Buongiorno${state.settings.ownerName?(', '+esc(state.settings.ownerName)):''} 🌤️</h3>
    <div class="section-label">${new Date().toLocaleDateString('it-IT',{weekday:'long', day:'numeric', month:'long'})}</div>
    <div class="stat-row" style="margin:14px 0;">
      <div class="stat"><div class="label">Punteggio amministrativo</div><div class="value" style="color:${admin.color};">${admin.score}</div></div>
      <div class="stat"><div class="label">Speso questo mese</div><div class="value">${euro(spentThisMonth)}</div></div>
    </div>
    ${overdue.length?`<div class="notice">⚠ Hai ${overdue.length} scadenza/e in ritardo: ${overdue.slice(0,3).map(u=>esc(u.title)).join(', ')}${overdue.length>3?'…':''}.</div>`:''}
    ${urgent.length? `<div class="section-label">Nei prossimi 3 giorni:</div>${urgent.map(u=>`<div class="due-item"><div class="due-left"><div class="t">${esc(u.title)}</div><div class="s">${esc(u.sub)}</div></div>${badgeFor(u.diff)}</div>`).join('')}` : `<div class="empty">Nessuna scadenza imminente. Giornata tranquilla!</div>`}
    ${admin.details.length? `<div class="section-label" style="margin-top:12px;">Da tenere d'occhio: ${admin.details.join(' · ')}</div>` : ''}
  `;
}
function openBriefingModal(){
  openModal(buildBriefingHTML() + `<div class="modal-actions"><button class="btn primary" onclick="closeBriefing()">Va bene, grazie</button></div>`);
  state.settings.lastBriefingShown = todayStr();
  saveState();
}
function closeBriefing(){ closeModal(); }

// ---------- aggiunta rapida a testo libero ----------
const IT_MONTHS_MAP = {gennaio:0,febbraio:1,marzo:2,aprile:3,maggio:4,giugno:5,luglio:6,agosto:7,settembre:8,ottobre:9,novembre:10,dicembre:11};
const QUICK_CAT_KEYWORDS = {
  Salute: ['dentista','medico','dottore','visita','controllo','analisi','ecografia','cardiologo','oculista'],
  Lavoro: ['bolletta','luce','gas','acqua','rata','pagamento','scadenza','fattura'],
  Famiglia: ['compleanno','festa','cena','pranzo','anniversario'],
  Sport: ['palestra','allenamento','partita','corsa','piscina'],
};
function guessQuickCategory(textLower){
  for(const [cat, words] of Object.entries(QUICK_CAT_KEYWORDS)){
    if(words.some(w=>textLower.includes(w))) return cat;
  }
  return 'Altro';
}
function parseQuickAdd(text){
  let t = text.trim();
  const lower = t.toLowerCase();
  let date = null, time = '';

  // ora: "alle 10", "alle 10:30", "ore 9"
  const timeMatch = lower.match(/\b(?:alle|ore)\s+(\d{1,2})(?:[:.](\d{2}))?/);
  if(timeMatch){ time = timeMatch[1].padStart(2,'0')+':'+(timeMatch[2]||'00'); t = t.replace(timeMatch[0],''); }

  const today = new Date();
  if(/\boggi\b/i.test(lower)){ date = todayStr(); t = t.replace(/\boggi\b/i,''); }
  else if(/\bdopodomani\b/i.test(lower)){ const d=new Date(today); d.setDate(d.getDate()+2); date=d.toISOString().slice(0,10); t=t.replace(/\bdopodomani\b/i,''); }
  else if(/\bdomani\b/i.test(lower)){ const d=new Date(today); d.setDate(d.getDate()+1); date=d.toISOString().slice(0,10); t=t.replace(/\bdomani\b/i,''); }
  else {
    // dd/mm o dd/mm/yyyy
    const dm = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if(dm){
      let yy = dm[3] ? (dm[3].length===2?'20'+dm[3]:dm[3]) : String(today.getFullYear());
      date = `${yy}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
      t = t.replace(dm[0],'');
    } else {
      // "15 marzo" oppure "15 marzo 2027"
      const im = lower.match(/(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?/);
      if(im){
        const yy = im[3] ? Number(im[3]) : today.getFullYear();
        const d = new Date(yy, IT_MONTHS_MAP[im[2]], Number(im[1]));
        date = d.toISOString().slice(0,10);
        t = t.replace(im[0],'');
      }
    }
  }
  if(!date) date = todayStr();
  const category = guessQuickCategory(lower);
  const title = t.replace(/\s+/g,' ').trim() || 'Nuovo impegno';
  return { title, date, time, category };
}
async function runQuickAdd(){
  const input = document.getElementById('quickAddInput');
  const text = input ? input.value.trim() : '';
  if(!text){ toast('Scrivi qualcosa prima di aggiungere.'); return; }
  pushUndo();
  let parsed;
  if(aiAvailable){
    try{
      const r = await fetch('/api/ai/quickadd', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text}) });
      const d = await r.json();
      if(d.ok) parsed = { title:d.title, date:d.date, time:d.time||'', category:d.category||'Altro' };
    }catch(e){ /* uso il fallback qui sotto */ }
  }
  if(!parsed) parsed = parseQuickAdd(text);
  const item = { id:uid(), title: parsed.title.charAt(0).toUpperCase()+parsed.title.slice(1), date: parsed.date, time: parsed.time, note:'', recur:'none', category: parsed.category };
  state.events.push(item);
  logActivity('added','event', item.title+' (aggiunta rapida)');
  saveState();
  if(input) input.value='';
  toast(`Aggiunto "${item.title}" al ${fmtD(item.date)}${item.time?(' alle '+item.time):''}. Controllalo in Calendario.`);
}

// ---------- MODAL ----------
function uniqueHints(values){ return [...new Set(values.flatMap(value=>Array.isArray(value)?value:[value]).map(value=>String(value||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it')); }
function applyFieldHints(){
  const modal = document.getElementById('modalBody');
  if(!modal) return;
  const hints = {
    f_provider: uniqueHints(state.bills.map(b=>b.provider)),
    f_title: uniqueHints([
      ...state.health.map(x=>x.title), ...state.homeTasks.map(x=>x.title), ...state.installments.map(x=>x.title),
      ...state.homeDocuments.map(x=>x.title), ...state.personalDocs.map(x=>x.title), ...state.events.map(x=>x.title),
      ...state.expenses.map(x=>x.title)
    ]),
    f_category: uniqueHints([
      ...state.expenses.map(x=>x.category), ...state.events.map(x=>x.category), ...state.contacts.map(x=>x.category),
      ...state.wellness.routines.map(x=>x.category)
    ]),
    f_name: uniqueHints([...state.medicines.map(x=>x.name), ...state.cars.map(x=>x.name), ...state.contacts.map(x=>x.name), ...state.assets.map(x=>x.name)]),
    f_city: uniqueHints([state.homeInfo.city]),
    f_method: uniqueHints(state.bills.map(b=>b.method)),
    f_med: uniqueHints(state.health.map(x=>x.med)),
    f_tags: uniqueHints([
      ...state.health.flatMap(x=>x.tags||[]), ...state.homeTasks.flatMap(x=>x.tags||[]), ...state.homeDocuments.flatMap(x=>x.tags||[]),
      ...state.personalDocs.flatMap(x=>x.tags||[]), ...state.expenses.flatMap(x=>x.tags||[]), ...state.carEvents.flatMap(x=>x.tags||[])
    ])
  };
  Object.entries(hints).forEach(([fieldId, values])=>{
    const input = modal.querySelector('#'+fieldId);
    if(!input || input.tagName==='SELECT' || !values.length) return;
    const listId = `${fieldId}Hints`;
    input.setAttribute('list', listId);
    const datalist = document.createElement('datalist');
    datalist.id = listId;
    values.forEach(value=>{
      const option = document.createElement('option');
      option.value = value;
      datalist.appendChild(option);
    });
    modal.appendChild(datalist);
  });
}
function openModal(html){ document.getElementById('modalBody').innerHTML = html; applyFieldHints(); document.getElementById('overlay').classList.add('active'); }
function closeModal(){ stopFamilyScanner(); document.getElementById('overlay').classList.remove('active'); }
document.getElementById('overlay').addEventListener('click', (e)=>{ if(e.target.id==='overlay') closeModal(); });

// ---------- RICERCA + TAG ----------
function buildSearchIndex(){
  const idx = [];
  state.health.forEach(h=>idx.push({type:'Salute', label:h.title||h.cat, sub:h.cat, text:(h.title+' '+h.cat+' '+(h.desc||'')+' '+(h.med||'')+' '+(h.tags||[]).join(' ')).toLowerCase(), tags:h.tags||[], go:()=>{ setTab('health'); openHealthForm(h.id); }}));
  state.bills.forEach(b=>idx.push({type:'Bolletta', label:b.provider, sub:b.frequency||'', text:(b.provider+' '+(b.method||'')).toLowerCase(), tags:[], go:()=>{ setTab('house'); openBillForm(b.id); }}));
  state.homeTasks.forEach(t=>idx.push({type:'Lavoro casa', label:t.title, sub:t.status, text:(t.title+' '+(t.note||'')+' '+(t.tags||[]).join(' ')).toLowerCase(), tags:t.tags||[], go:()=>{ setTab('house'); openTaskForm(t.id); }}));
  state.installments.forEach(i=>idx.push({type:'Rata', label:i.title, sub:'', text:(i.title||'').toLowerCase(), tags:[], go:()=>{ setTab('house'); openInstForm(i.id); }}));
  state.homeDocuments.forEach(d=>idx.push({type:'Documento casa', label:d.title, sub:d.category, text:(d.title+' '+(d.note||'')+' '+d.category+' '+(d.tags||[]).join(' ')).toLowerCase(), tags:d.tags||[], go:()=>{ setTab('house'); openDocForm(d.id); }}));
  state.personalDocs.forEach(p=>idx.push({type:'Documento personale', label:p.title||p.type, sub:p.type, text:(p.title+' '+p.type+' '+(p.note||'')+' '+(p.tags||[]).join(' ')).toLowerCase(), tags:p.tags||[], go:()=>{ setTab('admin'); openPersonalDocForm(p.id); }}));
  state.contacts.forEach(c=>idx.push({type:'Contatto', label:c.name, sub:c.category, text:(c.name+' '+c.category+' '+(c.phone||'')).toLowerCase(), tags:[], go:()=>{ setTab('admin'); openContactForm(c.id); }}));
  state.medicines.forEach(m=>idx.push({type:'Farmaco', label:m.name, sub:m.expiryDate?fmtD(m.expiryDate):'', text:(m.name+' '+(m.note||'')+' '+(m.tags||[]).join(' ')).toLowerCase(), tags:m.tags||[], go:()=>{ setTab('health'); openMedicineForm(m.id); }}));
  state.seasonalTasks.forEach(s=>idx.push({type:'Manutenzione stagionale', label:s.title, sub:'', text:(s.title+' '+(s.note||'')).toLowerCase(), tags:[], go:()=>{ setTab('house'); openSeasonalForm(s.id); }}));
  state.assets.forEach(a=>idx.push({type:'Bene', label:a.name, sub:'', text:(a.name+' '+(a.note||'')).toLowerCase(), tags:[], go:()=>{ setTab('admin'); openAssetForm(a.id); }}));
  (state.wellness.routines||[]).forEach(r=>idx.push({type:'Benessere', label:r.label, sub:r.category, text:(r.label+' '+r.category).toLowerCase(), tags:[], go:()=>{ setTab('wellness'); openRoutineForm(r.id); }}));
  state.cars.forEach(c=>idx.push({type:'Auto', label:c.name, sub:c.plate||'', text:(c.name+' '+(c.model||'')+' '+(c.plate||'')).toLowerCase(), tags:[], go:()=>{ setTab('cars'); }}));
  state.carEvents.forEach(e=>{ const car=state.cars.find(x=>x.id===e.carId); idx.push({type:'Evento auto', label:e.type+(car?(' · '+car.name):''), sub:e.date, text:(e.type+' '+(e.note||'')+' '+(e.tags||[]).join(' ')).toLowerCase(), tags:e.tags||[], go:()=>{ setTab('cars'); }}); });
  state.events.filter(e=>!e.linkedFrom).forEach(e=>idx.push({type:'Calendario', label:e.title, sub:fmtD(e.date), text:(e.title+' '+(e.note||'')).toLowerCase(), tags:[], go:()=>jumpToCalendarEvent(e.id)}));
  return idx;
}
function onSearchInput(q){ searchQuery = q; renderSearchDropdown(); }
function renderSearchDropdown(){
  const box = document.getElementById('searchResults'); if(!box) return;
  const q = searchQuery.trim().toLowerCase();
  if(q.length<2){ box.innerHTML=''; box.classList.remove('active'); return; }
  const results = buildSearchIndex().filter(r=>r.text.includes(q)).slice(0,10);
  if(results.length===0){ box.innerHTML = `<div class="search-empty">Nessun risultato per "${esc(searchQuery)}"</div>`; box.classList.add('active'); return; }
  box.innerHTML = results.map((r,i)=>`
    <div class="search-result-item" onclick="runSearchResult(${i})">
      <span class="tag">${esc(r.type)}</span>
      <div><div class="item-title" style="font-size:13px;">${esc(r.label)}</div><div class="item-meta">${esc(r.sub||'')}</div></div>
    </div>`).join('');
  box.classList.add('active'); window._searchResults = results;
}
function runSearchResult(i){
  const r = window._searchResults[i];
  document.getElementById('searchResults').classList.remove('active');
  document.getElementById('searchInput').value=''; searchQuery='';
  if(r) r.go();
}
function jumpToCalendarEvent(id){
  const e = state.events.find(x=>x.id===id); if(!e) return;
  const [y,m,d] = e.date.split('-').map(Number);
  calYear=y; calMonth=m-1; calMode='month'; setTab('calendar'); openDay(d);
}
// ---------- ricerca a voce ----------
function startVoiceSearch(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('searchMicBtn');
  if(!SR){ toast('Il riconoscimento vocale non è supportato da questo browser (funziona su Chrome/Android).'); return; }
  const recognition = new SR();
  recognition.lang = 'it-IT';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  if(btn) btn.classList.add('listening');
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    const input = document.getElementById('searchInput');
    if(input){ input.value = text; input.focus(); }
    searchQuery = text;
    renderSearchDropdown();
  };
  recognition.onerror = () => { toast('Non ho capito, riprova.'); };
  recognition.onend = () => { if(btn) btn.classList.remove('listening'); };
  recognition.start();
}
function filterByTag(tag){
  const results = buildSearchIndex().filter(r=>(r.tags||[]).includes(tag));
  openModal(`
    <h3>Etichetta #${esc(tag)}</h3>
    ${results.length? results.map((r,i)=>`
      <div class="item" style="cursor:pointer;" onclick="closeModal(); (window._tagResults[${i}]).go();">
        <div class="item-top"><div><span class="tag">${esc(r.type)}</span><div class="item-title">${esc(r.label)}</div><div class="item-meta">${esc(r.sub||'')}</div></div></div>
      </div>`).join('') : `<div class="empty">Nessun altro elemento con questa etichetta.</div>`}
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Chiudi</button></div>
  `);
  window._tagResults = results;
}
document.addEventListener('click', (e)=>{
  const wrap = document.getElementById('searchWrap');
  if(wrap && !wrap.contains(e.target)){ const box=document.getElementById('searchResults'); if(box) box.classList.remove('active'); }
});

// ---------- calcoli mensili/annuali ----------
function sumForMonth(m){ return state.expenses.filter(e=>(e.date||'').startsWith(m)).reduce((s,e)=>s+e.amount,0); }
function monthlyTotalsForYear(year){
  const arr = new Array(12).fill(0);
  state.expenses.forEach(e=>{ if(!e.date) return; const [y,m] = e.date.split('-').map(Number); if(y===year) arr[m-1]+=e.amount; });
  return arr;
}
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const CHART_COLORS = ['#00A6FB','#0582CA','#006494','#003554','#051923','#7EC8F2','#4F7A91'];

// ---------- RENDER ----------
function render(){
  const app = document.getElementById('app');
  const tabs = document.querySelector('nav.tabs');
  const tabsScrollLeft = tabs ? tabs.scrollLeft : 0;
  app.innerHTML = `
    <div class="header">
      <div>
        <h1>Il mio taccuino ${isOffline?'<span class="offline-badge">Offline</span>':''}</h1>
        <div class="sub">Salute, casa, spese, auto e calendario — sul tuo computer, sempre disponibile.</div>
      </div>
      <div class="header-right">
        <div class="search-wrap" id="searchWrap">
          <div class="search-box">${ICONS.search}<input id="searchInput" placeholder="Cerca ovunque…" oninput="onSearchInput(this.value)" onfocus="renderSearchDropdown()"><button class="mic-btn" id="searchMicBtn" title="Cerca a voce" onclick="startVoiceSearch()">${ICONS.mic}</button></div>
          <div class="search-results" id="searchResults"></div>
        </div>
        <button class="btn icon-btn" title="Recap giornaliero" aria-label="Recap giornaliero" onclick="openBriefingModal()">${ICONS.briefing}</button>
        <button class="btn icon-btn" title="Annulla ultima modifica" onclick="undoLast()">${ICONS.undo}</button>
        <button class="btn icon-btn" title="Impostazioni" onclick="setTab('settings')">${ICONS.gear}</button>
        <button class="btn icon-btn" title="Cambia tema" onclick="toggleTheme()">${state.settings.theme==='dark'?ICONS.sun:ICONS.moon}</button>
        <button class="btn icon-btn" title="Stampa riepilogo" onclick="openPrintSummary()">${ICONS.print}</button>
      </div>
    </div>
    <nav class="tabs">
      ${tabBtn('home','calendar','Panoramica')}
      ${tabBtn('health','health','Salute')}
      ${tabBtn('house','house','Casa')}
      ${tabBtn('savings','piggy','Salvadanaio')}
      ${tabBtn('cars','car','Auto')}
      ${tabBtn('calendar','calendar','Calendario')}
      ${tabBtn('wellness','droplet','Benessere')}
      ${tabBtn('admin','admin','Amministrazione')}
      ${tabBtn('settings','gear','Impostazioni')}
    </nav>
    <div class="panel ${activeTab==='home'?'active':''}">${renderHome()}</div>
    <div class="panel ${activeTab==='health'?'active':''}">${renderHealth()}</div>
    <div class="panel ${activeTab==='house'?'active':''}">${renderHouse()}</div>
    <div class="panel ${activeTab==='savings'?'active':''}">${renderSavings()}</div>
    <div class="panel ${activeTab==='cars'?'active':''}">${renderCars()}</div>
    <div class="panel ${activeTab==='calendar'?'active':''}">${renderCalendar()}</div>
    <div class="panel ${activeTab==='wellness'?'active':''}">${renderWellness()}</div>
    <div class="panel ${activeTab==='admin'?'active':''}">${renderAdmin()}</div>
    <div class="panel ${activeTab==='settings'?'active':''}">${renderSettings()}</div>
    <div class="ai-assistant" id="aiAssistant">
      <div class="ai-panel" id="aiPanel" hidden>
        <div class="ai-panel-head"><strong>Assistente</strong><button class="ai-close" title="Chiudi assistente" onclick="toggleAIAssistant()">×</button></div>
        <div class="ai-panel-sub">${aiAvailable?'Chiedimi qualcosa sui tuoi dati.':'Collega un provider da Impostazioni per iniziare.'}</div>
        <div id="aiAskAnswer"></div>
        <div class="ai-input-row"><input id="aiAskInput" placeholder="Scrivi una domanda…" ${aiAvailable?'':'disabled'} onkeyup="if(event.key==='Enter') askTaccuino()"><button class="btn primary" onclick="askTaccuino()" ${aiAvailable?'':'disabled'}>Invia</button></div>
      </div>
      <button class="ai-fab" title="Apri assistente AI" aria-label="Apri assistente AI" onclick="toggleAIAssistant()"><span aria-hidden="true">🤖</span></button>
    </div>
  `;
  const newTabs = app.querySelector('nav.tabs');
  if(newTabs) newTabs.scrollLeft = tabsScrollLeft;
  if(activeTab==='home') setTimeout(renderYearlyChart, 0);
  if(activeTab==='savings') setTimeout(renderSavingsCharts, 0);
}
function tabBtn(id,icon,label){ return `<button class="${activeTab===id?'active':''}" onclick="setTab('${id}')">${ICONS[icon]}${label}</button>`; }
function setTab(id){ activeTab=id; render(); }

// ===== HOME =====
function renderHome(){
  const totalSpese = state.expenses.reduce((s,e)=>s+e.amount,0);
  const upcoming = collectUpcoming().slice(0,10);
  const thisMonth = todayStr().slice(0,7);
  const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth()-1);
  const lastMonth = lastMonthDate.toISOString().slice(0,7);
  const curM = sumForMonth(thisMonth), prevM = sumForMonth(lastMonth);
  const diffPct = prevM>0 ? Math.round(((curM-prevM)/prevM)*100) : null;
  const year = new Date().getFullYear();
  const yearTotal = state.expenses.filter(e=>(e.date||'').startsWith(String(year))).reduce((s,e)=>s+e.amount,0);
  const healthVisits = state.health.filter(h=>(h.date||'').startsWith(String(year))).length;
  const carCostYear = state.carEvents.filter(e=>(e.date||'').startsWith(String(year))).reduce((s,e)=>s+(Number(e.cost)||0),0);
  const admin = computeAdminScore();

  return `
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Aggiungi rapido</h2>${aiAvailable?'<span class="tag" style="background:var(--c-salute-soft);color:var(--c-salute);border-color:transparent;">✨ AI</span>':''}</div>
    <div class="section-label">Scrivi in linguaggio naturale, es. "dentista domani alle 10" o "revisione auto 15 marzo" — creo un impegno in calendario da rivedere e completare.</div>
    <div style="display:flex;gap:8px;">
      <input id="quickAddInput" placeholder="Scrivi qui…" style="flex:1;padding:10px 12px;border:1px solid var(--line);border-radius:10px;" onkeyup="if(event.key==='Enter') runQuickAdd()">
      <button class="btn primary" onclick="runQuickAdd()">Aggiungi</button>
    </div>
  </div>
  <div class="stat-row">
    <div class="stat"><div class="label">Spese registrate</div><div class="value">${euro(totalSpese)}</div></div>
    <div class="stat"><div class="label">Spese questo mese</div><div class="value">${euro(curM)}</div>${diffPct!==null?`<div class="item-meta" style="margin-top:2px;">${diffPct>=0?'+':''}${diffPct}% rispetto al mese scorso</div>`:''}</div>
    <div class="stat"><div class="label">Auto in gestione</div><div class="value">${state.cars.filter(c=>!c.archived).length}</div></div>
    <div class="stat"><div class="label">Punteggio amministrativo</div><div class="value" style="color:${admin.color};">${admin.score}</div><div class="item-meta">${admin.label}</div></div>
  </div>
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('calendar','var(--c-calendario)','var(--c-calendario-soft)')}<h2>Prossime scadenze</h2></div></div>
    <div class="section-label">Le scadenze di salute, bollette, rate, auto, farmaci e documenti personali vengono aggiunte automaticamente anche al Calendario. Giorni di anticipo e invio email: in Impostazioni.</div>
    ${upcoming.length? upcoming.map(u=>`<div class="due-item"><div class="due-left"><div class="t">${esc(u.title)}</div><div class="s">${esc(u.sub)}</div></div>${u.diff>21?`<span class="due-badge">${fmtD(u.date)}</span>`:badgeFor(u.diff)}</div>`).join('') : `<div class="empty">Nessuna scadenza imminente. Aggiungine da Salute, Casa, Auto o Calendario.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:17px;">Riepilogo ${year}</h2></div>
    <div class="stat-row">
      <div class="stat"><div class="label">Speso quest'anno</div><div class="value">${euro(yearTotal)}</div></div>
      <div class="stat"><div class="label">Visite/controlli salute</div><div class="value">${healthVisits}</div></div>
      <div class="stat"><div class="label">Spese auto</div><div class="value">${euro(carCostYear)}</div></div>
    </div>
    <div class="chart-wrap"><canvas id="chartYearly" height="90"></canvas></div>
  </div>`;
}
function toggleAIAssistant(){
  const panel = document.getElementById('aiPanel');
  if(!panel) return;
  panel.hidden = !panel.hidden;
  if(!panel.hidden) document.getElementById('aiAskInput')?.focus();
}
function buildAIContext(){
  return JSON.stringify({
    oggi: todayStr(),
    speseRecenti: state.expenses.slice(-30).map(e=>({data:e.date,importo:e.amount,categoria:e.category,descrizione:e.description||e.note||''})),
    prossimeScadenze: collectUpcoming().slice(0,20).map(e=>({data:e.date,titolo:e.title,info:e.sub||''})),
    auto: state.cars.map(c=>({nome:c.name,modello:c.model,targa:c.plate})),
    bollette: state.bills.map(b=>({fornitore:b.provider,frequenza:b.frequency,importo:b.amount,scadenza:b.nextDue}))
  });
}
async function askTaccuino(){
  const input = document.getElementById('aiAskInput');
  const answerBox = document.getElementById('aiAskAnswer');
  const question = input ? input.value.trim() : '';
  if(!question){ toast('Scrivi una domanda prima di inviarla.'); return; }
  if(!aiAvailable){ toast('Collega prima un provider AI da Impostazioni.'); return; }
  if(input) input.disabled = true;
  if(answerBox) answerBox.innerHTML = `<div class="section-label" style="margin-top:10px;">Sto pensando…</div>`;
  try{
    const system = 'Sei l\'assistente personale del taccuino. Rispondi in italiano, in modo conciso e pratico. Usa solo il contesto fornito e dichiara quando un dato non è presente. Contesto: '+buildAIContext();
    const headers = {'Content-Type':'application/json'};
    let url = aiConfig.endpoint;
    let body;
    if(aiConfig.provider==='claude'){
      headers['x-api-key'] = aiConfig.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      body = {model:aiConfig.model,max_tokens:800,system,messages:[{role:'user',content:question}]};
    } else if(aiConfig.provider==='gemini'){
      url += (url.includes('?')?'&':'?')+'key='+encodeURIComponent(aiConfig.apiKey);
      body = {systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:question}]}]};
    } else {
      headers.Authorization = `Bearer ${aiConfig.apiKey}`;
      body = {model:aiConfig.model,messages:[{role:'system',content:system},{role:'user',content:question}],temperature:0.3};
    }
    const r = await fetch(url, {method:'POST',headers,body:JSON.stringify(body)});
    const d = await r.json();
    if(!r.ok) throw new Error(d?.error?.message || d?.message || 'Risposta non valida');
    const answer = aiConfig.provider==='claude' ? d.content?.map(x=>x.text||'').join('') : aiConfig.provider==='gemini' ? d.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('') : d.choices?.[0]?.message?.content;
    if(answerBox){
      answerBox.innerHTML = answer
        ? `<div class="item ai-answer"><div class="item-desc">${esc(answer)}</div></div>`
        : `<div class="notice" style="margin-top:10px;">La risposta del provider è vuota.</div>`;
    }
  }catch(e){
    if(answerBox) answerBox.innerHTML = `<div class="notice" style="margin-top:10px;">Non riesco a contattare il provider: ${esc(e.message||'errore di connessione')}.</div>`;
  }finally{
    if(input) input.disabled = false;
  }
}
function renderYearlyChart(){
  const canvas = document.getElementById('chartYearly'); if(!canvas || typeof Chart==='undefined') return;
  const data = monthlyTotalsForYear(new Date().getFullYear());
  if(chartYearly) chartYearly.destroy();
  chartYearly = new Chart(canvas, { type:'bar', data:{ labels:MONTHS_SHORT, datasets:[{ label:'Spese', data, backgroundColor:'#0582CA', borderRadius:6 }]}, options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true } } } });
}

// ===== SALUTE =====
const HEALTH_CATS = ['Infortunio / Frattura','Vista','Cardiologia','Ecografia','Analisi del sangue','Podologia','Altro'];
function renderHealth(){
  const items = [...state.health].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return `
  <div class="card">
    <div class="card-head">
      <div class="title-group">${sectionIcon('health','var(--c-salute)','var(--c-salute-soft)')}<h2>Salute</h2></div>
      <div style="display:flex;gap:8px;">
        <button class="btn small subtle" onclick="openMedicalExport()">Esporta spese detraibili</button>
        <button class="btn primary" onclick="openHealthForm()">+ Aggiungi voce</button>
      </div>
    </div>
    ${items.length? items.map(h=>`
      <div class="item">
        <div class="item-top">
          <div>
            <span class="tag">${esc(h.cat)}</span>
            ${h.recurMonths?`<span class="tag badge-recur">ogni ${h.recurMonths} mesi</span>`:''}
            <div class="item-title">${esc(h.title||h.cat)}</div>
            <div class="item-meta">${h.date?('Data: '+fmtD(h.date)):''} ${h.nextDate?(' · Prossimo controllo: '+fmtD(h.nextDate)):''}</div>
          </div>
          <div class="item-actions">
            ${h.recurMonths?`<button class="btn small subtle" onclick="markHealthDone('${h.id}')">Effettuato</button>`:''}
            <button class="btn small ghost" onclick="openHealthForm('${h.id}')">Modifica</button>
            <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa voce di salute?', ()=>deleteHealth('${h.id}'))">Elimina</button>
          </div>
        </div>
        ${h.desc?`<div class="item-desc">${esc(h.desc)}</div>`:''}
        ${h.med?`<div class="item-meta" style="margin-top:6px;">💊 Medicinale usato: <strong>${esc(h.med)}</strong></div>`:''}
        ${h.cost?`<div class="item-meta">Costo: ${euro(h.cost)}</div>`:''}
        ${h.files&&h.files.length?`<div class="files-row">${h.files.map((f)=>`<span class="file-chip">📎 <a href="#" onclick="openAttachment('${encodeURIComponent(f.path)}'); return false;">${esc(f.name)}</a></span>`).join('')}</div>`:''}
        ${tagsChips(h.tags)}
      </div>`).join('') : `<div class="empty">Ancora nessuna voce. Aggiungi infortuni, visite o controlli.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Farmacia</h2><button class="btn primary" onclick="openMedicineForm()">+ Aggiungi farmaco</button></div>
    <div class="section-label">Tieni traccia dei farmaci a casa con una scadenza da monitorare (specie quelli cronici).</div>
    ${[...state.medicines].sort((a,b)=>(a.expiryDate||'').localeCompare(b.expiryDate||'')).map(m=>`
      <div class="item"><div class="item-top">
        <div><div class="item-title">${esc(m.name)}</div><div class="item-meta">${m.expiryDate?('Scade il '+fmtD(m.expiryDate)):'Nessuna scadenza impostata'}</div>${m.note?`<div class="item-desc">${esc(m.note)}</div>`:''}${tagsChips(m.tags)}</div>
        <div class="item-actions"><button class="btn small ghost" onclick="openMedicineForm('${m.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo farmaco?', ()=>deleteMedicine('${m.id}'))">Elimina</button></div>
      </div></div>`).join('') || `<div class="empty">Nessun farmaco monitorato.</div>`}
  </div>`;
}
function openMedicineForm(id){
  const m = id ? state.medicines.find(x=>x.id===id) : {name:'',expiryDate:'',note:'',tags:[]};
  openModal(`
    <h3>${id?'Modifica farmaco':'Nuovo farmaco'}</h3>
    <div class="field"><label>Nome</label><input id="f_name" value="${esc(m.name||'')}"></div>
    <div class="field"><label>Scadenza</label><input type="date" id="f_expiryDate" value="${m.expiryDate||''}"></div>
    <div class="field"><label>Note (es. dosaggio, a cosa serve)</label><textarea id="f_note">${esc(m.note||'')}</textarea></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((m.tags||[]).join(', '))}"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveMedicine('${id||''}')">Salva</button></div>
  `);
}
function saveMedicine(id){
  pushUndo();
  let item = id ? state.medicines.find(x=>x.id===id) : {id:uid()};
  item.name=val('f_name'); item.expiryDate=val('f_expiryDate'); item.note=val('f_note'); item.tags=parseTags(val('f_tags'));
  if(!id) state.medicines.push(item);
  syncLinkedEvent('med-'+item.id, item.expiryDate, 'Scadenza farmaco: '+item.name, 'Farmacia');
  logActivity(id?'edited':'added','medicine', item.name);
  closeModal(); saveState(); toast('Farmaco salvato.');
}
function deleteMedicine(id){
  pushUndo();
  const m = state.medicines.find(x=>x.id===id); if(!m) return;
  trashItem('medicine', m, m.name);
  state.medicines=state.medicines.filter(x=>x.id!==id); removeLinkedEvent('med-'+id); saveState();
}
function findPreviousHealth(title, excludeId){
  const t = (title||'').trim().toLowerCase(); if(!t) return null;
  const matches = state.health.filter(h=>h.id!==excludeId && (h.title||'').trim().toLowerCase()===t).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return matches[0] || null;
}
function checkHealthHistory(title){
  const hint = document.getElementById('healthHistoryHint'); if(!hint) return;
  const prev = findPreviousHealth(title, null);
  if(prev){
    hint.style.display='block';
    hint.innerHTML = `Hai già registrato "<strong>${esc(prev.title)}</strong>" il ${fmtD(prev.date)}.${prev.med?(' Avevi usato: <strong>'+esc(prev.med)+'</strong>.'):' Non avevi indicato un medicinale.'}`;
  } else { hint.style.display='none'; }
}
function openHealthForm(id){
  const h = id ? state.health.find(x=>x.id===id) : {cat:HEALTH_CATS[0],title:'',date:todayStr(),nextDate:'',desc:'',med:'',cost:'',recurMonths:'',files:[],tags:[]};
  openModal(`
    <h3>${id?'Modifica voce salute':'Nuova voce salute'}</h3>
    <div class="field"><label>Ambito</label><select id="f_cat">${HEALTH_CATS.map(c=>`<option ${h.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Titolo (es. "Costola incrinata", "Emorroidi")</label><input id="f_title" value="${esc(h.title||'')}" oninput="checkHealthHistory(this.value)"></div>
    <div id="healthHistoryHint" class="notice" style="display:none;margin-bottom:12px;"></div>
    <div class="field-row">
      <div class="field"><label>Data evento / visita</label><input type="date" id="f_date" value="${h.date||''}"></div>
      <div class="field"><label>Prossimo controllo (opzionale)</label><input type="date" id="f_nextDate" value="${h.nextDate||''}"></div>
    </div>
    <div class="field"><label>Ripeti automaticamente ogni tot mesi (opzionale)</label><input type="number" id="f_recurMonths" value="${h.recurMonths||''}" placeholder="es. 12 per un controllo annuale"></div>
    <div class="field"><label>Dettagli (es. gradi vista, diagnosi, esito)</label><textarea id="f_desc">${esc(h.desc||'')}</textarea></div>
    <div class="field"><label>Medicinale / cura usata</label><input id="f_med" value="${esc(h.med||'')}" placeholder="così la prossima volta sai da dove partire"></div>
    <div class="field"><label>Costo (opzionale, va nel salvadanaio e nell'export spese mediche)</label><input type="number" step="0.01" id="f_cost" value="${h.cost||''}"></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((h.tags||[]).join(', '))}" placeholder="es. ristrutturazione, famiglia"></div>
    <div class="field"><label>Foto / documenti</label><input type="file" id="f_files" multiple accept="image/*,.pdf">
      <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${h.files&&h.files.length?h.files.length+' file già allegati (verranno mantenuti)':'Nessun file allegato'}</div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveHealth('${id||''}')">Salva</button></div>
  `);
  if(id) checkHealthHistory(h.title);
}
async function saveHealth(id){
  pushUndo();
  if(!val('f_title') && !val('f_cat')){ alert('Aggiungi almeno un titolo.'); return; }
  const newFiles = await readFiles(document.getElementById('f_files').files);
  let item = id ? state.health.find(x=>x.id===id) : {id:uid(), files:[]};
  item.cat = val('f_cat'); item.title = val('f_title'); item.date = val('f_date');
  item.nextDate = val('f_nextDate'); item.desc = val('f_desc'); item.med = val('f_med');
  item.cost = val('f_cost'); item.recurMonths = val('f_recurMonths'); item.tags = parseTags(val('f_tags'));
  item.files = (item.files||[]).concat(newFiles);
  if(!id) state.health.push(item);
  upsertExpense('health-'+item.id, item.title||item.cat, item.cost, item.date, 'Salute');
  syncLinkedEvent('health-next-'+item.id, item.nextDate, item.title||item.cat, 'Controllo salute · '+item.cat);
  logActivity(id?'edited':'added', 'health', item.title||item.cat);
  closeModal(); saveState(); toast('Voce salute salvata.');
}
function markHealthDone(id){
  pushUndo();
  const h = state.health.find(x=>x.id===id); if(!h) return;
  h.date = todayStr(); h.nextDate = addMonths(todayStr(), h.recurMonths||12);
  syncLinkedEvent('health-next-'+h.id, h.nextDate, h.title||h.cat, 'Controllo salute · '+h.cat);
  logActivity('edited','health', (h.title||h.cat)+' (effettuato)');
  saveState(); toast('Segnato come effettuato. Prossimo: '+fmtD(h.nextDate));
}
function deleteHealth(id){
  pushUndo();
  const h = state.health.find(x=>x.id===id); if(!h) return;
  trashItem('health', h, h.title||h.cat);
  state.health = state.health.filter(x=>x.id!==id); removeExpense('health-'+id); removeLinkedEvent('health-next-'+id); saveState();
}
function openMedicalExport(){
  const items = state.health.filter(h=>Number(h.cost)>0).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const total = items.reduce((s,h)=>s+Number(h.cost),0);
  const franchigia = 129.11;
  const eccedenza = Math.max(0, total-franchigia);
  const stimaDetrazione = eccedenza*0.19;
  openModal(`
    <h3>Spese mediche detraibili</h3>
    <div class="section-label">${items.length} voci con costo registrato, totale ${euro(total)}.</div>
    <div class="notice">Franchigia 730: primi ${euro(franchigia)} non detraibili. Eccedenza stimata: ${euro(eccedenza)} → detrazione indicativa al 19%: <strong>${euro(stimaDetrazione)}</strong>. Verifica sempre con un CAF o commercialista: questa è solo una stima.</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Chiudi</button><button class="btn primary" onclick="downloadMedicalCSV()">Scarica CSV</button></div>
  `);
}
function downloadMedicalCSV(){
  const items = state.health.filter(h=>Number(h.cost)>0).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const rows = [['Data','Titolo','Ambito','Costo','Medicinale/cura']];
  items.forEach(h=>rows.push([h.date||'', h.title||h.cat, h.cat, (Number(h.cost)||0).toFixed(2), h.med||'']));
  const total = items.reduce((s,h)=>s+Number(h.cost),0);
  rows.push(['','','','TOTALE', total.toFixed(2)]);
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`spese-mediche-${todayStr()}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  closeModal();
}

// ===== CASA =====
const DOC_CATS = ['Contratto','Planimetria','Garanzia elettrodomestico','Bolletta archiviata','Altro'];
function renderHouse(){
  const bills=[...state.bills];
  const allTasks=[...state.homeTasks].sort((a,b)=>(priorityRank(b.priority)-priorityRank(a.priority)));
  const archivedTaskCount = state.homeTasks.filter(t=>t.archived).length;
  const tasks = allTasks.filter(t=> showArchivedTasks ? true : !t.archived);
  const inst=[...state.installments], docs=[...state.homeDocuments];
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('house','var(--c-casa)','var(--c-casa-soft)')}<h2>Indirizzo</h2></div><button class="btn small ghost" onclick="openHomeInfoForm()">Modifica</button></div>
    ${state.homeInfo.street? `<div class="item-meta">${esc(state.homeInfo.street)}, ${esc(state.homeInfo.cap||'')} ${esc(state.homeInfo.city||'')}</div>${state.homeInfo.note?`<div class="item-desc">${esc(state.homeInfo.note)}</div>`:''}` : `<div class="empty">Nessun indirizzo inserito.</div>`}
  </div>
  <div class="card">
    <div class="card-head">
      <h2 style="font-size:16px;color:var(--ink-soft);">Bollette</h2>
      <div style="display:flex;gap:8px;">
        <label class="btn small subtle" style="display:inline-flex;align-items:center;">📷 Importa da PDF/foto<input type="file" accept="application/pdf,image/*" style="display:none" onchange="importBillFromFile(this)"></label>
        <button class="btn primary" onclick="openBillForm()">+ Aggiungi bolletta</button>
      </div>
    </div>
    <div class="section-label">L'import da PDF/foto è un aiuto automatico: controlla sempre i campi pre-compilati prima di salvare.</div>
    ${bills.length? bills.map(b=>{
      const anomaly = billAnomaly(b);
      return `
      <div class="item"><div class="item-top">
        <div><div class="item-title">${esc(b.provider)} ${anomaly?`<span class="tag ${anomaly.good?'badge-good':'badge-anomaly'}">${anomaly.text}</span>`:''}${isAutomaticBill(b)?'<span class="tag badge-good">Addebito automatico</span>':''}</div>
        <div class="item-meta">${esc(b.frequency||'')} · ${euro(b.amount)} · ${esc(b.method||'')}${b.nextDue?(' · prossima scadenza '+fmtD(b.nextDue)):''}</div></div>
        <div class="item-actions">
          <button class="btn small subtle" onclick="markBillPaid('${b.id}')">Segna pagata</button>
          <button class="btn small ghost" onclick="openBillForm('${b.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa bolletta?', ()=>deleteBill('${b.id}'))">Elimina</button>
        </div>
      </div></div>`;
    }).join('') : `<div class="empty">Nessuna bolletta registrata.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Lavori da ultimare</h2><button class="btn primary" onclick="openTaskForm()">+ Aggiungi lavoro</button></div>
    <div class="section-label">Ordinati per priorità (alta prima). ${archivedTaskCount>0?`<button class="link-toggle" onclick="toggleArchivedTasks()">${showArchivedTasks?'Nascondi archiviati':`Mostra archiviati (${archivedTaskCount})`}</button>`:''}</div>
    ${tasks.length? tasks.map(t=>`
      <div class="item"><div class="item-top">
        <div>${t.archived?'<span class="tag archived">Archiviato</span>':''}<span class="tag">${esc(t.status)}</span><span class="tag" style="background:${priorityColor(t.priority)};color:#fff;border-color:transparent;">${esc(t.priority||'Media')}</span><div class="item-title">${esc(t.title)}</div>${t.note?`<div class="item-desc">${esc(t.note)}</div>`:''}${t.cost?`<div class="item-meta">Costo: ${euro(t.cost)}</div>`:''}${tagsChips(t.tags)}</div>
        <div class="item-actions">
          ${t.archived? `<button class="btn small subtle" onclick="unarchiveTask('${t.id}')">Ripristina</button>` : t.status==='Completato' ? `<button class="btn small subtle" onclick="archiveTask('${t.id}')">Archivia</button>` : ''}
          <button class="btn small ghost" onclick="openTaskForm('${t.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo lavoro?', ()=>deleteTask('${t.id}'))">Elimina</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Nessun lavoro in lista.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Rate</h2><button class="btn primary" onclick="openInstForm()">+ Aggiungi rata</button></div>
    ${inst.length? inst.map(i=>`
      <div class="item"><div class="item-top">
        <div><div class="item-title">${esc(i.title)}</div>
        <div class="item-meta">${i.paidCount||0}/${i.totalCount||'?'} rate · ${euro(i.installmentAmount)} a rata su ${euro(i.totalAmount)}${i.nextDue?(' · prossima '+fmtD(i.nextDue)):''}</div></div>
        <div class="item-actions">
          <button class="btn small subtle" onclick="markInstPaid('${i.id}')">Segna rata pagata</button>
          <button class="btn small ghost" onclick="openInstForm('${i.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa rata?', ()=>deleteInst('${i.id}'))">Elimina</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Nessuna rata in corso.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('doc','var(--c-casa)','var(--c-casa-soft)')}<h2 style="font-size:16px;">Documenti della casa</h2></div><button class="btn primary" onclick="openDocForm()">+ Aggiungi documento</button></div>
    <div class="section-label">Contratti, planimetrie, garanzie: tutto quello che vuoi avere sempre a portata di mano.</div>
    ${docs.length? docs.map(d=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(d.category)}</span><div class="item-title">${esc(d.title)}</div>${d.note?`<div class="item-desc">${esc(d.note)}</div>`:''}${tagsChips(d.tags)}</div>
        <div class="item-actions"><button class="btn small ghost" onclick="openDocForm('${d.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo documento?', ()=>deleteDoc('${d.id}'))">Elimina</button></div>
      </div>
      ${d.files&&d.files.length?`<div class="files-row">${d.files.map((f)=>`<span class="file-chip">📎 <a href="#" onclick="openAttachment('${encodeURIComponent(f.path)}'); return false;">${esc(f.name)}</a></span>`).join('')}</div>`:''}
      </div>`).join('') : `<div class="empty">Nessun documento archiviato.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Manutenzioni stagionali</h2><button class="btn primary" onclick="openSeasonalForm()">+ Aggiungi manutenzione</button></div>
    <div class="section-label">Cose che vanno fatte una volta l'anno ma non hanno una data fissa — pulizia caldaia, grondaie, cambio gomme.</div>
    ${[...state.seasonalTasks].sort((a,b)=>a.month-b.month).map(s=>{
      const currentYear = new Date().getFullYear();
      const isDue = (s.lastDoneYear||0) < currentYear && (new Date().getMonth()+1) >= s.month;
      return `<div class="item"><div class="item-top">
        <div>${isDue?'<span class="tag badge-anomaly">da fare</span>':''}<div class="item-title">${esc(s.title)}</div><div class="item-meta">Periodo: ${MONTHS[s.month-1]}${s.lastDoneYear?(' · ultima volta: '+s.lastDoneYear):' · mai fatta'}</div>${s.note?`<div class="item-desc">${esc(s.note)}</div>`:''}</div>
        <div class="item-actions">
          <button class="btn small subtle" onclick="markSeasonalDone('${s.id}')">Segnata fatta quest'anno</button>
          <button class="btn small ghost" onclick="openSeasonalForm('${s.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa manutenzione?', ()=>deleteSeasonalTask('${s.id}'))">Elimina</button>
        </div>
      </div></div>`;
    }).join('') || `<div class="empty">Nessuna manutenzione stagionale impostata.</div>`}
  </div>`;
}
const MONTHS_SEASON = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function openSeasonalForm(id){
  const s = id ? state.seasonalTasks.find(x=>x.id===id) : {title:'',month:new Date().getMonth()+1,note:'',lastDoneYear:''};
  openModal(`
    <h3>${id?'Modifica manutenzione':'Nuova manutenzione stagionale'}</h3>
    <div class="field"><label>Titolo (es. "Pulizia caldaia")</label><input id="f_title" value="${esc(s.title||'')}"></div>
    <div class="field"><label>Periodo dell'anno</label><select id="f_month">${MONTHS_SEASON.map((m,i)=>`<option value="${i+1}" ${s.month===i+1?'selected':''}>${m}</option>`).join('')}</select></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(s.note||'')}</textarea></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveSeasonalTask('${id||''}')">Salva</button></div>
  `);
}
function saveSeasonalTask(id){
  pushUndo();
  let item = id ? state.seasonalTasks.find(x=>x.id===id) : {id:uid(), lastDoneYear:''};
  item.title=val('f_title'); item.month=Number(val('f_month')); item.note=val('f_note');
  if(!id) state.seasonalTasks.push(item);
  logActivity(id?'edited':'added','seasonalTask', item.title);
  closeModal(); saveState();
}
function markSeasonalDone(id){
  pushUndo();
  const s = state.seasonalTasks.find(x=>x.id===id); if(!s) return;
  s.lastDoneYear = new Date().getFullYear();
  logActivity('edited','seasonalTask', s.title+' (fatta)');
  saveState(); toast("Segnata come fatta per quest'anno.");
}
function deleteSeasonalTask(id){
  pushUndo();
  const s = state.seasonalTasks.find(x=>x.id===id); if(!s) return;
  trashItem('seasonalTask', s, s.title);
  state.seasonalTasks=state.seasonalTasks.filter(x=>x.id!==id); saveState();
}
function toggleArchivedTasks(){ showArchivedTasks=!showArchivedTasks; render(); }
function archiveTask(id){
  pushUndo(); const t=state.homeTasks.find(x=>x.id===id); if(!t) return; t.archived=true; logActivity('archived','homeTask', t.title); saveState(); }
function unarchiveTask(id){
  pushUndo(); const t=state.homeTasks.find(x=>x.id===id); if(!t) return; t.archived=false; logActivity('restored','homeTask', t.title+' (dall\u2019archivio)'); saveState(); }
function priorityRank(p){ return {'Alta':3,'Media':2,'Bassa':1}[p]||2; }
function priorityColor(p){ return {'Alta':'#C0554D','Media':'#C99A2E','Bassa':'#7FA06F'}[p]||'#C99A2E'; }
function billAnomaly(bill){
  const payments = state.expenses.filter(e=>e.sourceKey && e.sourceKey.startsWith('bill-payment-') && e.title==='Pagamento '+bill.provider);
  if(payments.length<2 || !bill.amount) return null;
  const avg = payments.reduce((s,p)=>s+p.amount,0)/payments.length;
  if(avg<=0) return null;
  const diff = Math.round(((Number(bill.amount)-avg)/avg)*100);
  if(diff>=20) return { text:(diff>0?'+':'')+diff+'% vs media', good:false };
  if(diff<=-15) return { text:diff+'% vs media 🎉', good:true };
  return null;
}
function openHomeInfoForm(){
  const h = state.homeInfo;
  openModal(`
    <h3>Indirizzo di casa</h3>
    <div class="field"><label>Via e numero</label><input id="f_street" value="${esc(h.street||'')}"></div>
    <div class="field-row"><div class="field"><label>Città</label><input id="f_city" value="${esc(h.city||'')}"></div><div class="field"><label>CAP</label><input id="f_cap" value="${esc(h.cap||'')}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(h.note||'')}</textarea></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveHomeInfo()">Salva</button></div>
  `);
}
function saveHomeInfo(){
  pushUndo(); state.homeInfo = {street:val('f_street'),city:val('f_city'),cap:val('f_cap'),note:val('f_note')}; closeModal(); saveState(); }
function openBillForm(id){
  const b = id ? state.bills.find(x=>x.id===id) : {provider:'',frequency:'Mensile',amount:'',method:'',nextDue:''};
  openModal(`
    <h3>${id?'Modifica bolletta':'Nuova bolletta'}</h3>
    <div class="field"><label>Gestore</label><input id="f_provider" value="${esc(b.provider||'')}"></div>
    <div class="field-row">
      <div class="field"><label>Frequenza</label><select id="f_frequency">${['Mensile','Bimestrale','Trimestrale','Semestrale','Annuale'].map(f=>`<option ${b.frequency===f?'selected':''}>${f}</option>`).join('')}</select></div>
      <div class="field"><label>Importo</label><input type="number" step="0.01" id="f_amount" value="${b.amount||''}"></div>
    </div>
    <div class="field"><label>Metodo di pagamento</label><select id="f_method">
      <option value="Addebito diretto" ${/addebito|automatic|domicilia|rid|sepa/i.test(b.method||'')?'selected':''}>Addebito diretto (automatico)</option>
      <option value="Bonifico" ${b.method==='Bonifico'?'selected':''}>Bonifico</option>
      <option value="Carta" ${b.method==='Carta'?'selected':''}>Carta</option>
      <option value="Contanti" ${b.method==='Contanti'?'selected':''}>Contanti</option>
      <option value="Altro" ${b.method && !/addebito|automatic|domicilia|rid|sepa/i.test(b.method||'') && !['Bonifico','Carta','Contanti'].includes(b.method)?'selected':''}>Altro</option>
    </select></div>
    ${id?'':`<div class="field"><label>Data di un pagamento già effettuato (opzionale)</label><input type="date" id="f_paymentDate" value=""></div>`}
    <div class="field"><label>Prossima scadenza</label><input type="date" id="f_nextDue" value="${b.nextDue||''}"></div>
    <div class="section-label">Con “Addebito diretto”, alla data della prossima scadenza il pagamento verrà aggiunto automaticamente allo storico.</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveBill('${id||''}')">Salva</button></div>
  `);
}
function saveBill(id){
  pushUndo();
  let item = id ? state.bills.find(x=>x.id===id) : {id:uid()};
  item.provider=val('f_provider'); item.frequency=val('f_frequency'); item.amount=val('f_amount');
  item.method=val('f_method'); item.nextDue=val('f_nextDue');
  if(!id){
    state.bills.push(item);
    const paymentDate = val('f_paymentDate');
    if(paymentDate && Number(item.amount)>0) addExpense('bill-payment-'+item.id, 'Pagamento '+item.provider, item.amount, paymentDate, 'Bollette');
  }
  syncLinkedEvent('bill-due-'+item.id, item.nextDue, 'Scadenza '+item.provider, 'Bolletta · '+euro(item.amount));
  logActivity(id?'edited':'added','bill', item.provider);
  closeModal(); saveState(); toast('Bolletta salvata.');
}
function markBillPaid(id){
  const b = state.bills.find(x=>x.id===id); if(!b) return;
  openModal(`
    <h3>Pagamento ${esc(b.provider)}</h3>
    <div class="field"><label>Data del pagamento</label><input type="date" id="f_paymentDate" value="${todayStr()}"></div>
    <div class="field"><label>Importo</label><input type="number" step="0.01" id="f_paymentAmount" value="${b.amount||''}"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveBillPayment('${id}')">Salva pagamento</button></div>
  `);
}
function saveBillPayment(id){
  pushUndo();
  const b = state.bills.find(x=>x.id===id); if(!b) return;
  const paymentDate = val('f_paymentDate')||todayStr();
  const amount = val('f_paymentAmount')||b.amount;
  addExpense('bill-payment-'+uid(), 'Pagamento '+b.provider, amount, paymentDate, 'Bollette');
  if(b.nextDue) b.nextDue = addPeriod(b.nextDue, b.frequency||'Mensile');
  syncLinkedEvent('bill-due-'+b.id, b.nextDue, 'Scadenza '+b.provider, 'Bolletta · '+euro(b.amount));
  closeModal(); saveState(); toast('Pagamento archiviato con la data indicata.');
}
function deleteBill(id){
  pushUndo();
  const b = state.bills.find(x=>x.id===id); if(!b) return;
  trashItem('bill', b, b.provider);
  state.bills=state.bills.filter(x=>x.id!==id); removeLinkedEvent('bill-due-'+id); saveState();
}
function openTaskForm(id){
  const t = id ? state.homeTasks.find(x=>x.id===id) : {title:'',status:'Da fare',priority:'Media',note:'',cost:'',tags:[]};
  openModal(`
    <h3>${id?'Modifica lavoro':'Nuovo lavoro'}</h3>
    <div class="field"><label>Titolo</label><input id="f_title" value="${esc(t.title||'')}"></div>
    <div class="field-row">
      <div class="field"><label>Stato</label><select id="f_status">${['Da fare','In corso','Completato'].map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>Priorità</label><select id="f_priority">${['Alta','Media','Bassa'].map(p=>`<option ${(t.priority||'Media')===p?'selected':''}>${p}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(t.note||'')}</textarea></div>
    <div class="field"><label>Costo stimato/reale (opzionale)</label><input type="number" step="0.01" id="f_cost" value="${t.cost||''}"></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((t.tags||[]).join(', '))}" placeholder="es. ristrutturazione bagno"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveTask('${id||''}')">Salva</button></div>
  `);
}
function saveTask(id){
  pushUndo();
  let item = id ? state.homeTasks.find(x=>x.id===id) : {id:uid()};
  item.title=val('f_title'); item.status=val('f_status'); item.priority=val('f_priority'); item.note=val('f_note'); item.cost=val('f_cost'); item.tags=parseTags(val('f_tags'));
  if(!id) state.homeTasks.push(item);
  if(item.status==='Completato' && Number(item.cost)>0){
    const previousExpense = state.expenses.find(expense=>expense.sourceKey==='task-'+item.id);
    item.completedDate = item.completedDate || previousExpense?.date || todayStr();
    upsertExpense('task-'+item.id, item.title, item.cost, item.completedDate, 'Lavori casa');
  } else {
    removeExpense('task-'+item.id);
    delete item.completedDate;
  }
  logActivity(id?'edited':'added','homeTask', item.title);
  closeModal(); saveState();
}
function deleteTask(id){
  pushUndo();
  const t = state.homeTasks.find(x=>x.id===id); if(!t) return;
  trashItem('homeTask', t, t.title);
  state.homeTasks=state.homeTasks.filter(x=>x.id!==id); removeExpense('task-'+id); saveState();
}
function openInstForm(id){
  const i = id ? state.installments.find(x=>x.id===id) : {title:'',totalAmount:'',installmentAmount:'',totalCount:'',paidCount:'',nextDue:'',frequency:'Mensile'};
  openModal(`
    <h3>${id?'Modifica rata':'Nuova rata'}</h3>
    <div class="field"><label>Titolo (es. "Divano", "Prestito auto")</label><input id="f_title" value="${esc(i.title||'')}"></div>
    <div class="field-row">
      <div class="field"><label>Importo totale</label><input type="number" step="0.01" id="f_totalAmount" value="${i.totalAmount||''}"></div>
      <div class="field"><label>Importo per rata</label><input type="number" step="0.01" id="f_installmentAmount" value="${i.installmentAmount||''}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Numero rate totali</label><input type="number" id="f_totalCount" value="${i.totalCount||''}"></div>
      <div class="field"><label>Rate già pagate</label><input type="number" id="f_paidCount" value="${i.paidCount||''}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Frequenza rata</label><select id="f_frequency">${['Mensile','Bimestrale','Trimestrale','Semestrale','Annuale'].map(f=>`<option ${(i.frequency||'Mensile')===f?'selected':''}>${f}</option>`).join('')}</select></div>
      <div class="field"><label>Prossima scadenza</label><input type="date" id="f_nextDue" value="${i.nextDue||''}"></div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveInst('${id||''}')">Salva</button></div>
  `);
}
function saveInst(id){
  pushUndo();
  let item = id ? state.installments.find(x=>x.id===id) : {id:uid()};
  item.title=val('f_title'); item.totalAmount=val('f_totalAmount'); item.installmentAmount=val('f_installmentAmount');
  item.totalCount=val('f_totalCount'); item.paidCount=val('f_paidCount'); item.nextDue=val('f_nextDue'); item.frequency=val('f_frequency');
  if(!id) state.installments.push(item);
  syncLinkedEvent('inst-due-'+item.id, item.nextDue, 'Rata '+item.title, 'Rata · '+euro(item.installmentAmount));
  logActivity(id?'edited':'added','installment', item.title);
  closeModal(); saveState(); toast('Rata salvata.');
}
function markInstPaid(id){
  pushUndo();
  const i = state.installments.find(x=>x.id===id); if(!i) return;
  addExpense('inst-payment-'+uid(), 'Rata '+i.title, i.installmentAmount, todayStr(), 'Rate');
  i.paidCount = (Number(i.paidCount)||0) + 1;
  if(i.nextDue) i.nextDue = addPeriod(i.nextDue, i.frequency||'Mensile');
  syncLinkedEvent('inst-due-'+i.id, i.nextDue, 'Rata '+i.title, 'Rata · '+euro(i.installmentAmount));
  saveState(); toast('Rata registrata come pagata.');
}
function deleteInst(id){
  pushUndo();
  const i = state.installments.find(x=>x.id===id); if(!i) return;
  trashItem('installment', i, i.title);
  state.installments=state.installments.filter(x=>x.id!==id); removeLinkedEvent('inst-due-'+id); saveState();
}
function openDocForm(id){
  const d = id ? state.homeDocuments.find(x=>x.id===id) : {title:'',category:DOC_CATS[0],note:'',files:[],tags:[]};
  openModal(`
    <h3>${id?'Modifica documento':'Nuovo documento'}</h3>
    <div class="field"><label>Titolo</label><input id="f_title" value="${esc(d.title||'')}"></div>
    <div class="field"><label>Categoria</label><select id="f_category">${DOC_CATS.map(c=>`<option ${d.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(d.note||'')}</textarea></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((d.tags||[]).join(', '))}"></div>
    <div class="field"><label>File</label><input type="file" id="f_files" multiple accept="image/*,.pdf">
      <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${d.files&&d.files.length?d.files.length+' file già allegati':'Nessun file allegato'}</div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveDoc('${id||''}')">Salva</button></div>
  `);
}
async function saveDoc(id){
  pushUndo();
  const newFiles = await readFiles(document.getElementById('f_files').files);
  let item = id ? state.homeDocuments.find(x=>x.id===id) : {id:uid(), files:[]};
  item.title=val('f_title'); item.category=val('f_category'); item.note=val('f_note'); item.tags=parseTags(val('f_tags'));
  item.files = (item.files||[]).concat(newFiles);
  if(!id) state.homeDocuments.push(item);
  logActivity(id?'edited':'added','homeDocument', item.title);
  closeModal(); saveState(); toast('Documento salvato.');
}
function deleteDoc(id){
  pushUndo();
  const d = state.homeDocuments.find(x=>x.id===id); if(!d) return;
  trashItem('homeDocument', d, d.title);
  state.homeDocuments=state.homeDocuments.filter(x=>x.id!==id); saveState();
}

// ---------- import bolletta da PDF/foto ----------
async function importBillFromFile(input){
  const file = input.files[0]; if(!file) return;
  toast('Analisi del file in corso…');
  try{
    const text = await extractTextFromFile(file);
    input.value='';
    if(!text){ toast('Formato non supportato: usa PDF o immagine.'); return; }
    let guess = null;
    if(aiAvailable){
      try{
        const r = await fetch('/api/ai/parse-document', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text, kind:'bill'}) });
        const d = await r.json();
        if(d.ok) guess = { provider:d.provider, amount:d.amount, date:d.date };
      }catch(e){ /* uso il fallback qui sotto */ }
    }
    if(!guess) guess = guessBillFields(text);
    openBillForm(null);
    setTimeout(()=>{
      if(guess.provider) document.getElementById('f_provider').value = guess.provider;
      if(guess.amount) document.getElementById('f_amount').value = guess.amount;
      if(guess.date) document.getElementById('f_nextDue').value = guess.date;
      const hint = document.createElement('div');
      hint.className='notice'; hint.style.marginBottom='12px';
      hint.textContent = 'Campi pre-compilati dalla scansione: controllali prima di salvare, potrebbero non essere precisi.';
      const modalBody = document.getElementById('modalBody');
      modalBody.insertBefore(hint, modalBody.children[1]);
    }, 30);
  }catch(e){
    console.error(e); toast('Non sono riuscito a leggere il file. Inserisci i dati manualmente.');
  }
}
function guessBillFields(text){
  const known = ['Enel','Eni','A2A','Acea','Iren','Hera','Sorgenia','TIM','Vodafone','WindTre','Wind Tre','Fastweb','Iliad'];
  let provider = ''; for(const k of known){ if(text.includes(k)){ provider=k; break; } }
  const amountMatches = [...text.matchAll(/(\d{1,4},\d{2})\s?€?/g)].map(m=>Number(m[1].replace(',','.')));
  let amount=''; if(amountMatches.length){ amount = amountMatches.sort((a,b)=>b-a)[0].toFixed(2); }
  const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  let date=''; if(dateMatch){ let day=dateMatch[1].padStart(2,'0'), month=dateMatch[2].padStart(2,'0'), year=dateMatch[3]; if(year.length===2) year='20'+year; date = `${year}-${month}-${day}`; }
  return {provider, amount, date};
}

// ---------- OCR generico per scontrini ----------
async function extractTextFromFile(file){
  if(file.type === 'application/pdf'){
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({data:buf}).promise;
    let text = '';
    for(let i=1;i<=Math.min(doc.numPages,3);i++){
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it=>it.str).join(' ') + '\n';
    }
    return text;
  } else if(file.type.startsWith('image/')){
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.4/tesseract.min.js');
    const result = await Tesseract.recognize(file, 'ita');
    return result.data.text;
  }
  return null;
}
function guessReceiptFields(text){
  // Su uno scontrino il "totale" è quasi sempre l'importo più alto tra quelli con due decimali,
  // spesso preceduto dalla parola TOTALE — se la troviamo, diamo priorità a quella riga.
  const totalLineMatch = text.match(/total[ei][^\d]{0,10}(\d{1,4}[.,]\d{2})/i);
  let amount = '';
  if(totalLineMatch){ amount = totalLineMatch[1].replace('.','').replace(',','.'); }
  else {
    const amountMatches = [...text.matchAll(/(\d{1,4},\d{2})\s?€?/g)].map(m=>Number(m[1].replace(',','.')));
    if(amountMatches.length) amount = amountMatches.sort((a,b)=>b-a)[0].toFixed(2);
  }
  const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  let date = '';
  if(dateMatch){ let day=dateMatch[1].padStart(2,'0'), month=dateMatch[2].padStart(2,'0'), year=dateMatch[3]; if(year.length===2) year='20'+year; date = `${year}-${month}-${day}`; }
  // prima riga non vuota, spesso il nome del negozio
  const firstLine = text.split('\n').map(l=>l.trim()).find(l=>l.length>2) || '';
  return { amount, date, title: firstLine.slice(0,40) };
}
async function importReceiptFromFile(input){
  const file = input.files[0]; if(!file) return;
  toast('Lettura dello scontrino in corso…');
  try{
    const text = await extractTextFromFile(file);
    input.value = '';
    if(!text){ toast('Formato non supportato: usa PDF o immagine.'); return; }
    let guess = null;
    if(aiAvailable){
      try{
        const r = await fetch('/api/ai/parse-document', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text, kind:'receipt'}) });
        const d = await r.json();
        if(d.ok) guess = { title:d.title, amount:d.amount, date:d.date };
      }catch(e){ /* uso il fallback qui sotto */ }
    }
    if(!guess) guess = guessReceiptFields(text);
    openExpenseForm();
    setTimeout(()=>{
      if(guess.title) document.getElementById('f_title').value = guess.title;
      if(guess.amount) document.getElementById('f_amount').value = guess.amount;
      if(guess.date) document.getElementById('f_date').value = guess.date;
      document.getElementById('f_category').value = 'Varie';
      const hint = document.createElement('div');
      hint.className='notice'; hint.style.marginBottom='12px';
      hint.textContent = 'Campi pre-compilati dalla scansione dello scontrino: controllali prima di salvare.';
      const modalBody = document.getElementById('modalBody');
      modalBody.insertBefore(hint, modalBody.children[1]);
    }, 30);
  }catch(e){
    console.error(e); toast('Non sono riuscito a leggere lo scontrino. Inserisci la spesa manualmente.');
  }
}

// ---------- riconciliazione con l'estratto conto ----------
function reconcileBankCSV(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
      if(lines.length===0){ toast('File vuoto.'); return; }
      const delim = lines[0].includes(';') ? ';' : ',';
      const rows = lines.map(l=>parseCSVLine(l, delim));
      // individua automaticamente quali colonne sono data, importo e descrizione
      const sample = rows[1] || rows[0];
      let dateCol=-1, amountCol=-1, descCol=-1;
      sample.forEach((val,i)=>{
        if(dateCol===-1 && (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(val) || !isNaN(Date.parse(val)))) dateCol=i;
        else if(amountCol===-1 && /^-?\d+([.,]\d{1,2})?$/.test(val.replace(/\s/g,''))) amountCol=i;
        else if(descCol===-1 && isNaN(Number(val)) && val.length>2) descCol=i;
      });
      if(dateCol===-1 || amountCol===-1){
        alert('Non riesco a capire il formato di questo CSV bancario. Servono almeno una colonna data e una importo.');
        input.value=''; return;
      }
      const startRow = (dateCol===0 && isNaN(Date.parse(rows[0][dateCol]))) ? 1 : 0;
      const bankTx = [];
      for(let i=startRow;i<rows.length;i++){
        const row = rows[i]; if(row.length<=Math.max(dateCol,amountCol)) continue;
        let d = row[dateCol];
        const dm = d.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
        if(dm){ let yy=dm[3]; if(yy.length===2) yy='20'+yy; d = `${yy}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`; }
        const amt = Math.abs(Number(String(row[amountCol]).replace(',','.')));
        if(!amt) continue;
        bankTx.push({ date:d, amount:amt, desc: descCol>-1?row[descCol]:'' });
      }
      const matched = [], unmatchedBank = [];
      const usedExpenseIds = new Set();
      bankTx.forEach(tx=>{
        const match = state.expenses.find(e=>{
          if(usedExpenseIds.has(e.id)) return false;
          const diffDays = Math.abs((new Date(tx.date+'T00:00') - new Date((e.date||'')+'T00:00'))/86400000);
          return Math.abs(e.amount - tx.amount) < 0.01 && diffDays<=3;
        });
        if(match){ matched.push(tx); usedExpenseIds.add(match.id); }
        else unmatchedBank.push(tx);
      });
      const unmatchedApp = state.expenses.filter(e=>!usedExpenseIds.has(e.id));
      window._reconcileUnmatchedBank = unmatchedBank;
      openModal(`
        <h3>Riconciliazione estratto conto</h3>
        <div class="section-label">${matched.length} transazioni corrispondenti su ${bankTx.length} lette dal file.</div>
        <div class="settings-section-title" style="margin-top:10px;">Nell'estratto conto ma non nel taccuino (${unmatchedBank.length})</div>
        ${unmatchedBank.length? unmatchedBank.slice(0,30).map(tx=>`<div class="due-item"><div class="due-left"><div class="t">${esc(tx.desc||'Movimento')}</div><div class="s">${fmtD(tx.date)}</div></div><div class="due-badge">${euro(tx.amount)}</div></div>`).join('') : `<div class="empty">Nessuna, tutto combacia.</div>`}
        <div class="settings-section-title" style="margin-top:14px;">Nel taccuino ma non nell'estratto (${unmatchedApp.length})</div>
        ${unmatchedApp.length? unmatchedApp.slice(0,30).map(e=>`<div class="due-item"><div class="due-left"><div class="t">${esc(e.title)}</div><div class="s">${fmtD(e.date)}</div></div><div class="due-badge">${euro(e.amount)}</div></div>`).join('') : `<div class="empty">Nessuna, tutto combacia.</div>`}
        <div class="modal-actions">
          <button class="btn ghost" onclick="closeModal()">Chiudi</button>
          ${unmatchedBank.length?`<button class="btn primary" onclick="addUnmatchedBankAsExpenses()">Aggiungi le mancanti come spese</button>`:''}
        </div>
      `);
    }catch(err){ console.error(err); alert('Non sono riuscito a leggere questo file. Assicurati sia un CSV esportato dalla tua banca.'); }
  };
  reader.readAsText(file); input.value='';
}
function addUnmatchedBankAsExpenses(){
  pushUndo();
  const list = window._reconcileUnmatchedBank || [];
  list.forEach(tx=>addExpense('bank-'+uid(), tx.desc||'Movimento bancario', tx.amount, tx.date, 'Da estratto conto', ['banca']));
  logActivity('added','expense', `${list.length} spese aggiunte da estratto conto`);
  closeModal(); saveState(); toast(`${list.length} spese aggiunte.`);
}

// ===== SALVADANAIO =====
function renderSavings(){
  const total = state.expenses.reduce((s,e)=>s+e.amount,0);
  const byCat = {};
  state.expenses.forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
  const sorted = [...state.expenses].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const thisMonth = todayStr().slice(0,7);
  const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth()-1);
  const lastMonth = lastMonthDate.toISOString().slice(0,7);
  const curM = sumForMonth(thisMonth), prevM = sumForMonth(lastMonth);
  const byCatThisMonth = {};
  state.expenses.filter(e=>(e.date||'').startsWith(thisMonth)).forEach(e=>{ byCatThisMonth[e.category]=(byCatThisMonth[e.category]||0)+e.amount; });
  const budgets = state.settings.budgets || {};
  const forecast = computeForecastNextMonth();
  const streak = computeBudgetStreak();

  return `
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Questo mese vs mese scorso</h2></div>
    <div class="stat-row">
      <div class="stat"><div class="label">Mese corrente</div><div class="value">${euro(curM)}</div></div>
      <div class="stat"><div class="label">Mese scorso</div><div class="value">${euro(prevM)}</div></div>
      <div class="stat"><div class="label">Differenza</div><div class="value">${prevM>0? (curM>=prevM?'+':'')+Math.round(((curM-prevM)/prevM)*100)+'%' : '—'}</div></div>
      <div class="stat"><div class="label">Stima mese prossimo</div><div class="value">${euro(forecast)}</div><div class="item-meta">Media ultimi 3 mesi</div></div>
    </div>
    ${streak>0?`<div class="notice">🔥 ${streak} mese/i di fila entro i budget impostati. Continua così!</div>`:''}
  </div>
  <div class="stat-row">
    <div class="stat"><div class="label">Totale spese registrate</div><div class="value">${euro(total)}</div></div>
    ${Object.entries(byCat).map(([c,v])=>`<div class="stat"><div class="label">${esc(c)}</div><div class="value">${euro(v)}</div></div>`).join('')}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Andamento</h2></div>
    <div class="chart-row">
      <div class="chart-wrap"><canvas id="chartMonthly" height="120"></canvas></div>
      <div class="chart-wrap"><canvas id="chartCategory" height="120"></canvas></div>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Budget mensile per categoria</h2><button class="btn small subtle" onclick="openBudgetForm()">+ Imposta budget</button></div>
    ${Object.keys(budgets).length? Object.entries(budgets).map(([cat,limit])=>{
      const spent = byCatThisMonth[cat]||0;
      const pct = limit>0 ? Math.min(100, Math.round((spent/limit)*100)) : 0;
      const over = spent>limit;
      const warn = !over && pct>=80;
      return `<div class="item">
        <div class="item-top"><div><div class="item-title">${esc(cat)}</div><div class="item-meta">${euro(spent)} di ${euro(limit)} questo mese</div></div>
        <div class="item-actions">${over?'<span class="tag badge-anomaly">superato</span>':''}<button class="btn small danger ghost" onclick="confirmDelete('Rimuovere questo budget?', ()=>deleteBudget('${esc(cat)}'))">Rimuovi</button></div></div>
        <div class="budget-bar-track"><div class="budget-bar-fill ${over?'over':warn?'warn':''}" style="width:${pct}%;"></div></div>
      </div>`;
    }).join('') : `<div class="empty">Nessun budget impostato. Aggiungine uno per ricevere un avviso quando ti avvicini al limite.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('piggy','var(--c-salvadanaio)','var(--c-salvadanaio-soft)')}<h2>Spese</h2></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <label class="btn small subtle" style="display:inline-flex;align-items:center;">📷 Scontrino<input type="file" accept="application/pdf,image/*" style="display:none" onchange="importReceiptFromFile(this)"></label>
        <label class="btn small subtle" style="display:inline-flex;align-items:center;">Importa CSV<input type="file" accept=".csv" style="display:none" onchange="importExpensesCSV(this)"></label>
        <label class="btn small subtle" style="display:inline-flex;align-items:center;">Confronta estratto conto<input type="file" accept=".csv" style="display:none" onchange="reconcileBankCSV(this)"></label>
        <button class="btn primary" onclick="openExpenseForm()">+ Aggiungi spesa</button>
      </div>
    </div>
    <div class="section-label">Salute, lavori in casa, auto entrano qui quando compili il costo. Bollette e rate entrano quando premi "Segna pagata". Il CSV deve avere colonne Data;Titolo;Categoria;Importo (come nell'export spese mediche). "Scontrino" prova a leggere una foto/PDF; "Confronta estratto conto" legge un CSV esportato dalla tua banca e verifica cosa manca.</div>
    ${sorted.length? sorted.map(e=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(e.category)}</span><div class="item-title">${esc(e.title)}</div><div class="item-meta">${fmtD(e.date)}</div>${tagsChips(e.tags)}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-weight:700;">${euro(e.amount)}</div>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa spesa?', ()=>deleteExpense('${e.id}'))">Elimina</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Nessuna spesa registrata ancora.</div>`}
  </div>`;
}
function computeForecastNextMonth(){
  const now = new Date();
  let sum = 0, months = 0;
  for(let i=1;i<=3;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = d.toISOString().slice(0,7);
    const total = sumForMonth(key);
    if(total>0){ sum += total; months++; }
  }
  return months>0 ? sum/months : 0;
}
function computeBudgetStreak(){
  const budgets = state.settings.budgets||{};
  if(Object.keys(budgets).length===0) return 0;
  let streak = 0;
  const now = new Date();
  for(let i=1;i<=24;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = d.toISOString().slice(0,7);
    const byCat = {};
    state.expenses.filter(e=>(e.date||'').startsWith(key)).forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
    const anyOver = Object.entries(budgets).some(([cat,limit])=>(byCat[cat]||0) > limit);
    if(anyOver) break;
    streak++;
  }
  return streak;
}
function renderSavingsCharts(){
  if(typeof Chart==='undefined') return;
  const year = new Date().getFullYear();
  const monthlyCanvas = document.getElementById('chartMonthly');
  if(monthlyCanvas){
    if(chartMonthly) chartMonthly.destroy();
    chartMonthly = new Chart(monthlyCanvas, { type:'bar', data:{ labels:MONTHS_SHORT, datasets:[{label:'Spese '+year, data:monthlyTotalsForYear(year), backgroundColor:'#0582CA', borderRadius:6}]}, options:{ plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} } });
  }
  const catCanvas = document.getElementById('chartCategory');
  if(catCanvas){
    const byCat = {};
    state.expenses.filter(e=>(e.date||'').startsWith(String(year))).forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
    const labels = Object.keys(byCat), data = Object.values(byCat);
    if(chartCategory) chartCategory.destroy();
    chartCategory = new Chart(catCanvas, { type:'doughnut', data:{ labels, datasets:[{data, backgroundColor:CHART_COLORS}] }, options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10,font:{size:11}}}} } });
  }
}
function openExpenseForm(){
  openModal(`
    <h3>Nuova spesa manuale</h3>
    <div class="field"><label>Titolo</label><input id="f_title" placeholder="es. Spesa alimentare"></div>
    <div class="field-row"><div class="field"><label>Importo</label><input type="number" step="0.01" id="f_amount"></div><div class="field"><label>Data</label><input type="date" id="f_date" value="${todayStr()}"></div></div>
    <div class="field"><label>Categoria</label><input id="f_category" placeholder="es. Varie"></div>
    <div class="field"><label>Etichette (separate da virgola, opzionale)</label><input id="f_tags" placeholder="es. nome di un bene da collegare"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveExpense()">Salva</button></div>
  `);
}
function saveExpense(){
  pushUndo();
  addExpense('manual-'+uid(), val('f_title'), val('f_amount'), val('f_date')||todayStr(), val('f_category')||'Varie', parseTags(val('f_tags')));
  logActivity('added','expense', val('f_title'));
  closeModal(); saveState();
}
function deleteExpense(id){
  pushUndo();
  const e = state.expenses.find(x=>x.id===id); if(!e) return;
  trashItem('expense', e, e.title);
  state.expenses=state.expenses.filter(x=>x.id!==id); saveState();
}
function parseCSVLine(line, delim){
  const out = []; let cur=''; let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const c = line[i];
    if(inQuotes){
      if(c==='"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else { inQuotes=false; } }
      else cur+=c;
    } else {
      if(c==='"') inQuotes=true;
      else if(c===delim){ out.push(cur); cur=''; }
      else cur+=c;
    }
  }
  out.push(cur);
  return out.map(s=>s.trim());
}
function importExpensesCSV(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      pushUndo();
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
      if(lines.length===0){ toast('File CSV vuoto.'); return; }
      const delim = lines[0].includes(';') ? ';' : ',';
      let start = 0;
      const firstRow = parseCSVLine(lines[0], delim);
      const looksLikeHeader = isNaN(Date.parse(firstRow[0])) ;
      if(looksLikeHeader) start = 1;
      let count = 0;
      for(let i=start;i<lines.length;i++){
        const row = parseCSVLine(lines[i], delim);
        if(row.length<4) continue;
        const [date, title, category, amountStr] = row;
        const amount = Number(String(amountStr).replace(',','.'));
        if(!title || !amount || amount<=0) continue;
        let d = date;
        const dm = date.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
        if(dm){ let yy=dm[3]; if(yy.length===2) yy='20'+yy; d = `${yy}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`; }
        addExpense('csv-'+uid(), title, amount, d||todayStr(), category||'Varie');
        count++;
      }
      logActivity('added','expense', `${count} spese importate da CSV`);
      saveState(); toast(`${count} spese importate.`);
    }catch(err){ console.error(err); alert('Non sono riuscito a leggere questo file CSV. Controlla il formato.'); }
  };
  reader.readAsText(file); input.value='';
}
function openBudgetForm(){
  const existingCats = Array.from(new Set(state.expenses.map(e=>e.category)));
  openModal(`
    <h3>Nuovo budget mensile</h3>
    <div class="field"><label>Categoria</label><input id="f_cat" list="catList" placeholder="es. Bollette"><datalist id="catList">${existingCats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
    <div class="field"><label>Limite mensile</label><input type="number" step="0.01" id="f_limit"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveBudget()">Salva</button></div>
  `);
}
function saveBudget(){
  pushUndo();
  const cat = val('f_cat').trim(); const limit = Number(val('f_limit'))||0;
  if(!cat || limit<=0){ alert('Inserisci categoria e importo validi.'); return; }
  state.settings.budgets[cat] = limit; closeModal(); saveState();
}
function deleteBudget(cat){
  pushUndo(); delete state.settings.budgets[cat]; saveState(); }

// ===== AUTO =====
function renderCars(){
  const archivedCount = state.cars.filter(c=>c.archived).length;
  const visibleCars = state.cars.filter(c=> showArchivedCars ? true : !c.archived);
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('car','var(--c-auto)','var(--c-auto-soft)')}<h2>Le mie auto</h2></div><button class="btn primary" onclick="openCarForm()">+ Aggiungi auto</button></div>
    ${archivedCount>0?`<div class="section-label"><button class="link-toggle" onclick="toggleArchivedCars()">${showArchivedCars?'Nascondi archiviate':`Mostra archiviate (${archivedCount})`}</button></div>`:''}
    ${visibleCars.length? visibleCars.map(c=>{
      const evts = state.carEvents.filter(e=>e.carId===c.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      const kmEstimate = carKmEstimate(c);
      const costPerKm = carCostPerKm(c);
      return `
      <div class="item">
        <div class="item-top">
          <div>${c.archived?'<span class="tag archived">Archiviata</span>':''}<div class="item-title">${esc(c.name)} ${c.plate?('· '+esc(c.plate)):''}</div>
          <div class="item-meta">${esc(c.model||'')} ${c.year?(' · '+c.year):''}${c.km?(' · '+Number(c.km).toLocaleString('it-IT')+' km'):''}</div>
          ${kmEstimate?`<div class="item-meta">${kmEstimate}</div>`:''}
          ${costPerKm?`<div class="item-meta">Costo stimato: ${costPerKm.toFixed(3)} €/km percorso</div>`:''}</div>
          <div class="item-actions">
            ${c.archived? `<button class="btn small subtle" onclick="unarchiveCar('${c.id}')">Ripristina</button>` : `<button class="btn small subtle" onclick="archiveCar('${c.id}')">Archivia</button>`}
            <button class="btn small subtle" onclick="openCarEventForm(null,'${c.id}')">+ Evento</button>
            <button class="btn small ghost" onclick="openCarForm('${c.id}')">Modifica</button>
            <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa auto e i suoi eventi?', ()=>deleteCar('${c.id}'))">Elimina</button>
          </div>
        </div>
        ${evts.length? `<div style="margin-top:10px;">${evts.map(e=>`
          <div class="item" style="background:var(--paper);">
            <div class="item-top">
              <div><span class="tag">${esc(e.type)}</span><div class="item-meta">${fmtD(e.date)}${e.cost?(' · '+euro(e.cost)):''}</div>${e.note?`<div class="item-desc">${esc(e.note)}</div>`:''}${tagsChips(e.tags)}</div>
              <div class="item-actions"><button class="btn small ghost" onclick="openCarEventForm('${e.id}','${c.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo evento?', ()=>deleteCarEvent('${e.id}'))">Elimina</button></div>
            </div>
          </div>`).join('')}</div>` : `<div class="empty">Nessun evento registrato per questa auto.</div>`}
      </div>`;
    }).join('') : `<div class="empty">Nessuna auto aggiunta.</div>`}
  </div>`;
}
function toggleArchivedCars(){ showArchivedCars=!showArchivedCars; render(); }
function archiveCar(id){
  pushUndo(); const c=state.cars.find(x=>x.id===id); if(!c) return; c.archived=true; logActivity('archived','car', c.name); saveState(); }
function unarchiveCar(id){
  pushUndo(); const c=state.cars.find(x=>x.id===id); if(!c) return; c.archived=false; logActivity('restored','car', c.name+' (dall\u2019archivio)'); saveState(); }
function carKmEstimate(c){
  if(!c.km || !c.lastServiceKm || !c.serviceIntervalKm) return null;
  const remaining = (Number(c.lastServiceKm)+Number(c.serviceIntervalKm)) - Number(c.km);
  if(remaining<=0) return `⚠️ Tagliando scaduto da circa ${Math.abs(remaining).toLocaleString('it-IT')} km`;
  if(remaining<=1000) return `🔧 Prossimo tagliando tra circa ${remaining.toLocaleString('it-IT')} km`;
  return `Prossimo tagliando stimato tra circa ${remaining.toLocaleString('it-IT')} km`;
}
function carCostPerKm(c){
  if(!c.startKm || !c.km || Number(c.km)<=Number(c.startKm)) return null;
  const totalCost = state.carEvents.filter(e=>e.carId===c.id).reduce((s,e)=>s+(Number(e.cost)||0),0);
  const kmDriven = Number(c.km)-Number(c.startKm);
  if(kmDriven<=0 || totalCost<=0) return null;
  return totalCost/kmDriven;
}
function openCarForm(id){
  const c = id ? state.cars.find(x=>x.id===id) : {name:'',plate:'',model:'',year:'',km:'',startKm:'',lastServiceKm:'',serviceIntervalKm:''};
  openModal(`
    <h3>${id?'Modifica auto':'Nuova auto'}</h3>
    <div class="field"><label>Nome (es. "Panda", "Auto di famiglia")</label><input id="f_name" value="${esc(c.name||'')}"></div>
    <div class="field-row"><div class="field"><label>Targa</label><input id="f_plate" value="${esc(c.plate||'')}"></div><div class="field"><label>Anno</label><input type="number" id="f_year" value="${c.year||''}"></div></div>
    <div class="field-row"><div class="field"><label>Modello</label><input id="f_model" value="${esc(c.model||'')}"></div><div class="field"><label>Km attuali</label><input type="number" id="f_km" value="${c.km||''}"></div></div>
    <div class="field"><label>Km iniziali (per calcolare il costo al km)</label><input type="number" id="f_startKm" value="${c.startKm||''}" placeholder="km quando hai iniziato a tracciare"></div>
    <div class="section-label">Promemoria tagliando basato sui km (opzionale)</div>
    <div class="field-row"><div class="field"><label>Km all'ultimo tagliando</label><input type="number" id="f_lastServiceKm" value="${c.lastServiceKm||''}"></div><div class="field"><label>Intervallo tagliando (km)</label><input type="number" id="f_serviceIntervalKm" value="${c.serviceIntervalKm||''}" placeholder="es. 15000"></div></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveCar('${id||''}')">Salva</button></div>
  `);
}
function saveCar(id){
  pushUndo();
  let item = id ? state.cars.find(x=>x.id===id) : {id:uid()};
  item.name=val('f_name'); item.plate=val('f_plate'); item.model=val('f_model'); item.year=val('f_year'); item.km=val('f_km'); item.startKm=val('f_startKm');
  item.lastServiceKm=val('f_lastServiceKm'); item.serviceIntervalKm=val('f_serviceIntervalKm');
  if(!id) state.cars.push(item);
  logActivity(id?'edited':'added','car', item.name);
  closeModal(); saveState();
}
function deleteCar(id){
  pushUndo();
  const c = state.cars.find(x=>x.id===id); if(!c) return;
  trashItem('car', c, c.name);
  state.cars=state.cars.filter(x=>x.id!==id);
  state.carEvents = state.carEvents.filter(e=>{ if(e.carId===id){ removeExpense('car-'+e.id); removeLinkedEvent('carevt-'+e.id); } return e.carId!==id; });
  saveState();
}
function openCarEventForm(id, carId){
  const e = id ? state.carEvents.find(x=>x.id===id) : {type:'Tagliando',date:todayStr(),note:'',cost:'',carId,tags:[]};
  openModal(`
    <h3>${id?'Modifica evento auto':'Nuovo evento auto'}</h3>
    <div class="field"><label>Tipo</label><select id="f_type">${['Tagliando','Revisione','Bollo','Assicurazione','Riparazione','Altro'].map(t=>`<option ${e.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field-row"><div class="field"><label>Data</label><input type="date" id="f_date" value="${e.date||''}"></div><div class="field"><label>Costo (opzionale)</label><input type="number" step="0.01" id="f_cost" value="${e.cost||''}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(e.note||'')}</textarea></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((e.tags||[]).join(', '))}"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveCarEvent('${id||''}','${carId}')">Salva</button></div>
  `);
}
function saveCarEvent(id, carId){
  pushUndo();
  let item = id ? state.carEvents.find(x=>x.id===id) : {id:uid(), carId};
  item.type=val('f_type'); item.date=val('f_date'); item.note=val('f_note'); item.cost=val('f_cost'); item.tags=parseTags(val('f_tags'));
  if(!id) state.carEvents.push(item);
  upsertExpense('car-'+item.id, item.type, item.cost, item.date, 'Auto');
  const car = state.cars.find(x=>x.id===carId);
  syncLinkedEvent('carevt-'+item.id, item.date, (car?car.name+' - ':'')+item.type, 'Auto');
  logActivity(id?'edited':'added','carEvent', item.type);
  closeModal(); saveState();
}
function deleteCarEvent(id){
  pushUndo();
  const e = state.carEvents.find(x=>x.id===id); if(!e) return;
  trashItem('carEvent', e, e.type);
  state.carEvents=state.carEvents.filter(x=>x.id!==id); removeExpense('car-'+id); removeLinkedEvent('carevt-'+id); saveState();
}

// ===== CALENDARIO =====
const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const DOW = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
function occursOn(e, y, m, d){
  if(!e.date) return false;
  const [by,bm,bd] = e.date.split('-').map(Number);
  const target = new Date(y,m,d); const base = new Date(by,bm-1,bd);
  if(target < base) return false;
  const recur = e.recur||'none';
  if(recur==='none') return by===y && (bm-1)===m && bd===d;
  if(recur==='monthly') return bd===d;
  if(recur==='yearly') return (bm-1)===m && bd===d;
  return false;
}
function eventsOnDate(y,m,d){ return state.events.filter(e=>occursOn(e,y,m,d)); }
function renderCalendar(){ return calMode==='week' ? renderCalendarWeek() : renderCalendarMonth(); }
function renderCalendarMonth(){
  const first = new Date(calYear, calMonth, 1);
  const startOffset = (first.getDay()+6)%7;
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const cells = []; for(let i=0;i<startOffset;i++) cells.push(null); for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const todayD = new Date();
  const isToday = (d)=> d && todayD.getFullYear()===calYear && todayD.getMonth()===calMonth && todayD.getDate()===d;
  return `
  <div class="card">
    <div class="cal-head">
      <div class="title-group">${sectionIcon('calendar','var(--c-calendario)','var(--c-calendario-soft)')}<h2>${MONTHS[calMonth]} ${calYear}</h2></div>
      <div class="cal-nav">
        <button class="btn small ${calMode==='month'?'subtle':'ghost'}" onclick="setCalMode('month')">Mese</button>
        <button class="btn small ${calMode==='week'?'subtle':'ghost'}" onclick="setCalMode('week')">Settimana</button>
        <button class="btn small ghost" onclick="calPrev()">‹</button><button class="btn small ghost" onclick="calToday()">Oggi</button><button class="btn small ghost" onclick="calNext()">›</button>
      </div>
    </div>
    <div class="cal-legend">${EVENT_CATS.map(c=>`<span class="legend-item"><span class="legend-dot" style="background:${EVENT_CAT_COLORS[c]};"></span>${c}</span>`).join('')}<span class="legend-item"><span class="legend-dot" style="background:${EVENT_CAT_COLORS.Amministrazione};"></span>Automatico</span></div>
    <div class="cal-grid">
      ${DOW.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
      ${cells.map(d=>{
        if(!d) return `<div class="cal-day empty"></div>`;
        const evts = eventsOnDate(calYear, calMonth, d);
        const shown = evts.slice(0,2); const extra = evts.length-shown.length;
        return `<div class="cal-day ${isToday(d)?'today':''}" onclick="openDay(${d})">
          <div class="num">${d}</div>
          ${shown.map(e=>`<div class="cal-evt" style="background:${eventColor(e)};">${esc(e.title)}</div>`).join('')}
          ${extra>0?`<div class="cal-evt more">+${extra} altro</div>`:''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function renderCalendarWeek(){
  const ref = new Date(weekRef); const dow=(ref.getDay()+6)%7;
  const monday = new Date(ref); monday.setDate(ref.getDate()-dow);
  const days = []; for(let i=0;i<7;i++){ const d=new Date(monday); d.setDate(monday.getDate()+i); days.push(d); }
  const todayD = new Date();
  const label = `${days[0].getDate()} ${MONTHS[days[0].getMonth()].slice(0,3)} – ${days[6].getDate()} ${MONTHS[days[6].getMonth()].slice(0,3)} ${days[6].getFullYear()}`;
  return `
  <div class="card">
    <div class="cal-head">
      <div class="title-group">${sectionIcon('calendar','var(--c-calendario)','var(--c-calendario-soft)')}<h2 style="text-transform:none;">${label}</h2></div>
      <div class="cal-nav">
        <button class="btn small ${calMode==='month'?'subtle':'ghost'}" onclick="setCalMode('month')">Mese</button>
        <button class="btn small ${calMode==='week'?'subtle':'ghost'}" onclick="setCalMode('week')">Settimana</button>
        <button class="btn small ghost" onclick="weekPrev()">‹</button><button class="btn small ghost" onclick="weekToday()">Oggi</button><button class="btn small ghost" onclick="weekNext()">›</button>
      </div>
    </div>
    <div class="week-grid">
      ${days.map(d=>{
        const evts = eventsOnDate(d.getFullYear(), d.getMonth(), d.getDate()).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
        const isToday = d.toDateString()===todayD.toDateString();
        return `<div class="week-day ${isToday?'today':''}">
          <div class="week-day-head">${DOW[(d.getDay()+6)%7]} <span>${d.getDate()}</span></div>
          <div class="week-day-body">
            ${evts.length? evts.map(e=>`<div class="cal-evt" style="margin-bottom:4px;cursor:pointer;background:${eventColor(e)};" onclick="openWeekDay(${d.getFullYear()},${d.getMonth()},${d.getDate()})">${e.time?esc(e.time)+' · ':''}${esc(e.title)}</div>`).join('') : `<div class="empty" style="padding:8px 2px;font-size:11.5px;cursor:pointer;" onclick="openWeekDay(${d.getFullYear()},${d.getMonth()},${d.getDate()})">+ aggiungi</div>`}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function setCalMode(m){ calMode=m; render(); }
function calPrev(){ calMonth--; if(calMonth<0){calMonth=11;calYear--;} render(); }
function calNext(){ calMonth++; if(calMonth>11){calMonth=0;calYear++;} render(); }
function calToday(){ const n=new Date(); calMonth=n.getMonth(); calYear=n.getFullYear(); render(); }
function weekPrev(){ weekRef.setDate(weekRef.getDate()-7); render(); }
function weekNext(){ weekRef.setDate(weekRef.getDate()+7); render(); }
function weekToday(){ weekRef = new Date(); render(); }
function openWeekDay(y,m,d){ calYear=y; calMonth=m; openDay(d); }
function dateStr(d){ return `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function openDay(d){
  selectedDay = d; renderSidebar();
  document.getElementById('sidebar').classList.add('active'); document.getElementById('scrim').classList.add('active');
}
function closeSidebar(){ document.getElementById('sidebar').classList.remove('active'); document.getElementById('scrim').classList.remove('active'); }
document.getElementById('scrim').addEventListener('click', closeSidebar);
function renderSidebar(){
  const ds = dateStr(selectedDay); const [y,m,d] = ds.split('-').map(Number);
  const evts = eventsOnDate(y, m-1, d).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-head"><h3>${selectedDay} ${MONTHS[m-1]}</h3><button class="btn small ghost" onclick="closeSidebar()">Chiudi</button></div>
    <button class="btn primary" style="width:100%;margin-bottom:14px;" onclick="closeSidebar(); openEventForm(null,'${ds}')">+ Aggiungi impegno</button>
    ${evts.length? evts.map(e=>`
      <div class="item">
        <div class="item-top">
          <div><div class="item-title"><span class="legend-dot" style="background:${eventColor(e)};"></span>${e.time?esc(e.time)+' · ':''}${esc(e.title)} ${e.linkedFrom?'<span class="tag">Auto</span>':''}${e.recur&&e.recur!=='none'?`<span class="tag badge-recur">${e.recur==='monthly'?'ogni mese':'ogni anno'}</span>`:''}</div>${e.note?`<div class="item-desc">${esc(e.note)}</div>`:''}</div>
          <div class="item-actions"><button class="btn small ghost" onclick="closeSidebar(); openEventForm('${e.id}','${ds}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo impegno?', ()=>deleteEvent('${e.id}'))">Elimina</button></div>
        </div>
      </div>`).join('') : `<div class="empty">Nessun impegno questo giorno.</div>`}
  `;
}
function openEventForm(id, ds){
  const e = id ? state.events.find(x=>x.id===id) : {title:'',time:'',note:'',date:ds,recur:'none',category:'Altro'};
  const isLinked = e.linkedFrom;
  openModal(`
    <h3>${id?'Modifica impegno':'Nuovo impegno'}</h3>
    ${isLinked?`<div class="notice">Questo impegno è collegato automaticamente a una scadenza (${esc(e.note||'')}). Modificalo dalla sezione di origine se vuoi cambiarne la data.</div>`:''}
    <div class="field"><label>Titolo</label><input id="f_title" value="${esc(e.title||'')}" ${isLinked?'disabled':''}></div>
    <div class="field-row"><div class="field"><label>Data</label><input type="date" id="f_date" value="${e.date||ds}" ${isLinked?'disabled':''}></div><div class="field"><label>Ora (opzionale)</label><input type="time" id="f_time" value="${e.time||''}"></div></div>
    <div class="field-row">
      <div class="field"><label>Ripetizione</label><select id="f_recur" ${isLinked?'disabled':''}>
        <option value="none" ${(e.recur||'none')==='none'?'selected':''}>Nessuna</option>
        <option value="monthly" ${e.recur==='monthly'?'selected':''}>Ogni mese</option>
        <option value="yearly" ${e.recur==='yearly'?'selected':''}>Ogni anno</option>
      </select></div>
      <div class="field"><label>Categoria</label><select id="f_category" ${isLinked?'disabled':''}>${EVENT_CATS.map(c=>`<option ${(e.category||'Altro')===c?'selected':''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Note</label><textarea id="f_note" ${isLinked?'disabled':''}>${esc(e.note||'')}</textarea></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveEvent('${id||''}')">Salva</button></div>
  `);
}
function saveEvent(id){
  pushUndo();
  let item = id ? state.events.find(x=>x.id===id) : {id:uid()};
  if(item.linkedFrom){
    item.time=val('f_time'); closeModal(); saveState(); renderSidebar();
    document.getElementById('sidebar').classList.add('active'); document.getElementById('scrim').classList.add('active');
    return;
  }
  if(!val('f_title')){ alert('Aggiungi un titolo.'); return; }
  item.title=val('f_title'); item.date=val('f_date'); item.time=val('f_time'); item.note=val('f_note'); item.recur=val('f_recur'); item.category=val('f_category');
  if(!id) state.events.push(item);
  logActivity(id?'edited':'added','event', item.title);
  const [y,m,d] = item.date.split('-').map(Number); calYear=y; calMonth=m-1; selectedDay=d;
  closeModal(); saveState(); renderSidebar();
  document.getElementById('sidebar').classList.add('active'); document.getElementById('scrim').classList.add('active');
}
function deleteEvent(id){
  pushUndo();
  const e = state.events.find(x=>x.id===id); if(!e) return;
  if(!e.linkedFrom) trashItem('event', e, e.title);
  state.events=state.events.filter(x=>x.id!==id); saveState(); renderSidebar();
}

// ---------- esporta/importa calendario .ics ----------
function icsEscape(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n'); }
function unescapeIcsText(s){ return String(s||'').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\n/g,'\n').trim(); }
function exportICS(){
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Il mio taccuino//IT\r\nCALSCALE:GREGORIAN\r\n';
  state.events.forEach(e=>{
    if(!e.date) return;
    const dt = e.date.replace(/-/g,'');
    let rrule = '';
    if(e.recur==='monthly') rrule = 'RRULE:FREQ=MONTHLY\r\n';
    if(e.recur==='yearly') rrule = 'RRULE:FREQ=YEARLY\r\n';
    ics += `BEGIN:VEVENT\r\nUID:${e.id}@iltaccuino\r\nDTSTAMP:${dt}T000000Z\r\nDTSTART;VALUE=DATE:${dt}\r\n${rrule}SUMMARY:${icsEscape(e.title)}\r\n${e.note?('DESCRIPTION:'+icsEscape(e.note)+'\r\n'):''}END:VEVENT\r\n`;
  });
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], {type:'text/calendar;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`calendario-taccuino-${todayStr()}.ics`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function importICS(input){
  pushUndo();
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const text = e.target.result;
      const blocks = text.split('BEGIN:VEVENT').slice(1);
      let count = 0;
      blocks.forEach(b=>{
        const body = b.split('END:VEVENT')[0];
        const summaryM = body.match(/SUMMARY:(.*)/);
        const dtM = body.match(/DTSTART[^:]*:(\d{8})(T(\d{2})(\d{2}))?/);
        const descM = body.match(/DESCRIPTION:(.*)/);
        const rruleM = body.match(/RRULE:.*FREQ=(\w+)/);
        if(!summaryM || !dtM) return;
        const y=dtM[1].slice(0,4), mo=dtM[1].slice(4,6), d=dtM[1].slice(6,8);
        const date = `${y}-${mo}-${d}`;
        const time = dtM[3] ? `${dtM[3]}:${dtM[4]}` : '';
        let recur='none';
        if(rruleM){ if(/MONTHLY/.test(rruleM[1])) recur='monthly'; if(/YEARLY/.test(rruleM[1])) recur='yearly'; }
        state.events.push({id:uid(), title: unescapeIcsText(summaryM[1]), date, time, note: descM?unescapeIcsText(descM[1]):'', recur});
        count++;
      });
      logActivity('added','event', `${count} eventi importati da .ics`);
      saveState(); toast(`${count} eventi importati.`);
    }catch(err){ alert('File .ics non valido o non supportato.'); }
  };
  reader.readAsText(file); input.value='';
}

// ===== AMMINISTRAZIONE =====
const PDOC_TYPES = ["Carta d'identità",'Passaporto','Patente','Tessera sanitaria','Altro'];
const CONTACT_CATS = ['Idraulico','Elettricista','Muratore/Edile','Meccanico','Medico di famiglia','Altro'];
// ===== BENESSERE =====
const WELLNESS_PRESETS = {
  'Acqua': { icon:'droplet', color:'#00A6FB', scheduleType:'interval', intervalMinutes:120, activeStart:'08:00', activeEnd:'21:00', label:'Bevi un bicchiere d\u2019acqua' },
  'Meditazione': { icon:'spark', color:'#006494', scheduleType:'daily', time:'08:00', label:'Qualche minuto di meditazione' },
  'Movimento': { icon:'spark', color:'#0582CA', scheduleType:'daily', time:'18:00', label:'Un po\u2019 di movimento o stretching' },
  'Sonno': { icon:'spark', color:'#003554', scheduleType:'daily', time:'22:30', label:'Prepararsi ad andare a dormire' },
  'Altro': { icon:'spark', color:'#4F7A91', scheduleType:'daily', time:'09:00', label:'' }
};
const WELLNESS_MESSAGES = {
  'Acqua': ['💧 È ora di bere un bicchiere d\u2019acqua.', '💧 Piccola pausa idratazione!', '💧 Il tuo corpo ti ringrazia: bevi un po\u2019 d\u2019acqua.'],
  'Meditazione': ['🧘 Qualche minuto per te: respira e rilassati.', '🧘 Momento di calma: 5 minuti di meditazione?', '🧘 Fermati un attimo e respira profondamente.'],
  'Movimento': ['🤸 Alzati e muoviti un po\u2019!', '🤸 Due minuti di stretching ti farebbero bene.', '🤸 Il corpo ha bisogno di movimento: dai, su!'],
  'Sonno': ['🌙 Comincia a prepararti per andare a dormire.', '🌙 Tra poco è ora di riposare.'],
  'Altro': ['✨ Promemoria: '],
};
function wellnessMessage(routine){
  const arr = WELLNESS_MESSAGES[routine.category] || WELLNESS_MESSAGES['Altro'];
  const base = arr[Math.floor(Math.random()*arr.length)];
  return routine.category==='Altro' ? base + routine.label : base;
}
function lastNDays(n){
  const days = [];
  for(let i=n-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  return days;
}
function computeRoutineStreak(routine){
  const done = new Set(routine.doneDates||[]);
  let streak = 0;
  let cursor = new Date();
  // se oggi non ancora fatto, parto comunque da ieri per non azzerare subito lo streak durante la giornata
  if(!done.has(cursor.toISOString().slice(0,10))) cursor.setDate(cursor.getDate()-1);
  while(done.has(cursor.toISOString().slice(0,10))){ streak++; cursor.setDate(cursor.getDate()-1); }
  return streak;
}
function renderWellness(){
  const routines = state.wellness.routines||[];
  const notifSupported = isNativeApp() ? !!nativeNotifications() : ('Notification' in window);
  const notifGranted = isNativeApp() ? false : (notifSupported && Notification.permission==='granted');
  // Su nativo non c'è modo semplice di leggere lo stato del permesso senza richiederlo:
  // mostriamo sempre il pulsante "Attiva notifiche", richiederlo di nuovo se già concesso non crea problemi.
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('droplet','var(--c-salute)','var(--c-salute-soft)')}<h2>Benessere</h2></div><button class="btn primary" onclick="openRoutineForm()">+ Aggiungi routine</button></div>
    <div class="section-label">Promemoria per bere acqua, meditare, muoverti o qualsiasi altra piccola abitudine. I promemoria funzionano finché tieni questa scheda aperta nel browser (non in background come un'app nativa).</div>
    ${notifSupported && !notifGranted ? `<div class="notice">Attiva le notifiche del browser per ricevere i promemoria anche se non stai guardando questa pagina. <button class="btn small subtle" style="margin-left:8px;" onclick="requestWellnessNotifications()">Attiva notifiche</button></div>` : ''}
    ${routines.length? routines.map(r=>{
      const streak = computeRoutineStreak(r);
      const days = lastNDays(7);
      const doneToday = (r.doneDates||[]).includes(todayStr());
      const schedule = r.scheduleType==='interval' ? `Ogni ${r.intervalMinutes} min, dalle ${r.activeStart} alle ${r.activeEnd}` : `Ogni giorno alle ${r.time}`;
      return `<div class="item">
        <div class="item-top">
          <div><span class="tag" style="background:${r.color||'var(--c-salute-soft)'}22;color:${r.color||'var(--c-salute)'};border-color:transparent;">${esc(r.category)}</span>${!r.enabled?'<span class="tag archived">In pausa</span>':''}<div class="item-title">${esc(r.label)}</div><div class="item-meta">${schedule}${streak>0?(' · 🔥 '+streak+' giorni di fila'):''}</div></div>
          <div class="item-actions">
            <button class="btn small ${doneToday?'subtle':'primary'}" onclick="toggleRoutineDoneToday('${r.id}')">${doneToday?'✅ Fatto oggi':'Segna fatto oggi'}</button>
            <button class="btn small ghost" onclick="toggleRoutineEnabled('${r.id}')">${r.enabled?'Metti in pausa':'Riattiva'}</button>
            <button class="btn small ghost" onclick="openRoutineForm('${r.id}')">Modifica</button>
            <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa routine?', ()=>deleteRoutine('${r.id}'))">Elimina</button>
          </div>
        </div>
        <div class="week-dots">${days.map(d=>`<span class="week-dot ${(r.doneDates||[]).includes(d)?'done':''}" title="${fmtD(d)}"></span>`).join('')}</div>
      </div>`;
    }).join('') : `<div class="empty">Nessuna routine impostata. Aggiungine una per iniziare — acqua, meditazione, movimento o quello che vuoi tu.</div>`}
  </div>`;
}
// Rileva se l'app gira dentro il contenitore nativo Capacitor (iOS/Android)
// oppure in un normale browser (dove usiamo le notifiche del browser per i test).
function isNativeApp(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}
function nativeNotifications(){
  return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
}
function requestWellnessNotifications(){
  if(isNativeApp() && nativeNotifications()){
    nativeNotifications().requestPermissions().then((res)=>{
      const ok = res && (res.display==='granted');
      toast(ok ? 'Notifiche attivate.' : 'Notifiche non attivate.');
      render();
    }).catch(()=>toast('Non sono riuscito ad attivare le notifiche.'));
    return;
  }
  if(!('Notification' in window)){ toast('Le notifiche non sono supportate da questo browser.'); return; }
  Notification.requestPermission().then((perm)=>{
    if(perm==='granted') toast('Notifiche attivate.'); else toast('Notifiche non attivate.');
    render();
  });
}
function openRoutineForm(id){
  const r = id ? state.wellness.routines.find(x=>x.id===id) : {category:'Acqua', ...WELLNESS_PRESETS['Acqua'], enabled:true, doneDates:[]};
  openModal(`
    <h3>${id?'Modifica routine':'Nuova routine'}</h3>
    <div class="field"><label>Categoria</label><select id="f_category" onchange="applyWellnessPreset(this.value)">${Object.keys(WELLNESS_PRESETS).map(c=>`<option ${r.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Etichetta (cosa ti deve ricordare)</label><input id="f_label" value="${esc(r.label||'')}"></div>
    <div class="field"><label>Tipo di promemoria</label><select id="f_scheduleType" onchange="toggleWellnessScheduleFields(this.value)">
      <option value="interval" ${r.scheduleType==='interval'?'selected':''}>Ad intervalli durante il giorno (es. acqua)</option>
      <option value="daily" ${r.scheduleType==='daily'?'selected':''}>Una volta al giorno ad un orario fisso</option>
    </select></div>
    <div id="wellnessIntervalFields" style="display:${r.scheduleType==='interval'?'block':'none'};">
      <div class="field-row">
        <div class="field"><label>Ogni quanti minuti</label><input type="number" id="f_intervalMinutes" value="${r.intervalMinutes||120}"></div>
        <div class="field"><label>Dalle</label><input type="time" id="f_activeStart" value="${r.activeStart||'08:00'}"></div>
        <div class="field"><label>Alle</label><input type="time" id="f_activeEnd" value="${r.activeEnd||'21:00'}"></div>
      </div>
    </div>
    <div id="wellnessDailyFields" style="display:${r.scheduleType==='daily'?'block':'none'};">
      <div class="field"><label>A che ora</label><input type="time" id="f_time" value="${r.time||'09:00'}"></div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveRoutine('${id||''}')">Salva</button></div>
  `);
}
function applyWellnessPreset(cat){
  const p = WELLNESS_PRESETS[cat]; if(!p) return;
  document.getElementById('f_label').value = p.label;
  document.getElementById('f_scheduleType').value = p.scheduleType;
  toggleWellnessScheduleFields(p.scheduleType);
  if(p.scheduleType==='interval'){
    document.getElementById('f_intervalMinutes').value = p.intervalMinutes;
    document.getElementById('f_activeStart').value = p.activeStart;
    document.getElementById('f_activeEnd').value = p.activeEnd;
  } else {
    document.getElementById('f_time').value = p.time;
  }
}
function toggleWellnessScheduleFields(type){
  document.getElementById('wellnessIntervalFields').style.display = type==='interval' ? 'block':'none';
  document.getElementById('wellnessDailyFields').style.display = type==='daily' ? 'block':'none';
}
function saveRoutine(id){
  pushUndo();
  const category = val('f_category');
  let item = id ? state.wellness.routines.find(x=>x.id===id) : {id:uid(), enabled:true, doneDates:[], lastFiredAt:0, lastFiredDate:''};
  item.category = category;
  item.label = val('f_label') || WELLNESS_PRESETS[category].label || category;
  item.scheduleType = val('f_scheduleType');
  item.color = WELLNESS_PRESETS[category] ? WELLNESS_PRESETS[category].color : '#0582CA';
  if(item.scheduleType==='interval'){
    item.intervalMinutes = Number(val('f_intervalMinutes'))||120;
    item.activeStart = val('f_activeStart')||'08:00';
    item.activeEnd = val('f_activeEnd')||'21:00';
  } else {
    item.time = val('f_time')||'09:00';
  }
  if(!id) state.wellness.routines.push(item);
  logActivity(id?'edited':'added','routine', item.label);
  closeModal(); saveState(); toast('Routine salvata.');
}
function toggleRoutineEnabled(id){
  pushUndo();
  const r = state.wellness.routines.find(x=>x.id===id); if(!r) return;
  r.enabled = !r.enabled; saveState();
}
function toggleRoutineDoneToday(id){
  pushUndo();
  const r = state.wellness.routines.find(x=>x.id===id); if(!r) return;
  r.doneDates = r.doneDates||[];
  const t = todayStr();
  if(r.doneDates.includes(t)) r.doneDates = r.doneDates.filter(d=>d!==t);
  else r.doneDates.push(t);
  saveState();
}
function deleteRoutine(id){
  pushUndo();
  const r = state.wellness.routines.find(x=>x.id===id); if(!r) return;
  trashItem('routine', r, r.label);
  state.wellness.routines = state.wellness.routines.filter(x=>x.id!==id); saveState();
}

// ---------- motore promemoria benessere ----------
let wellnessEngineStarted = false;
function startWellnessEngine(){
  if(wellnessEngineStarted) return;
  wellnessEngineStarted = true;
  checkWellnessReminders();
  setInterval(checkWellnessReminders, 60000);
}
function checkWellnessReminders(){
  if(!state.wellness || !state.wellness.routines) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0'), mm = String(now.getMinutes()).padStart(2,'0');
  const nowHM = `${hh}:${mm}`;
  let changed = false;
  state.wellness.routines.forEach(r=>{
    if(!r.enabled) return;
    if(r.scheduleType==='interval'){
      if(nowHM < r.activeStart || nowHM > r.activeEnd) return;
      const last = r.lastFiredAt||0;
      if(Date.now() - last >= (r.intervalMinutes||120)*60000){
        fireWellnessReminder(r); r.lastFiredAt = Date.now(); changed = true;
      }
    } else if(r.scheduleType==='daily'){
      if(r.time===nowHM && r.lastFiredDate!==todayStr()){
        fireWellnessReminder(r); r.lastFiredDate = todayStr(); changed = true;
      }
    }
  });
  if(changed) saveState();
}
function fireWellnessReminder(routine){
  const message = wellnessMessage(routine);
  if(isNativeApp() && nativeNotifications()){
    // id numerico richiesto dal plugin nativo: lo ricavo dall'id della routine
    const numericId = Math.abs(Array.from(routine.id).reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0, 0)) % 2147483647;
    nativeNotifications().schedule({
      notifications: [{
        id: numericId,
        title: routine.label,
        body: message,
        schedule: { at: new Date(Date.now() + 500) }
      }]
    }).catch(()=>{ /* se la pianificazione nativa fallisce, resta comunque il toast qui sotto */ });
  } else if('Notification' in window && Notification.permission==='granted'){
    try{ new Notification(routine.label, { body: message, icon:'/icons/icon-192.png' }); }catch(e){ /* ignoro se il browser blocca */ }
  }
  toast(message);
}

function renderAdmin(){
  const docs = [...state.personalDocs].sort((a,b)=>(a.expiryDate||'').localeCompare(b.expiryDate||''));
  const contacts = [...state.contacts].sort((a,b)=>a.name.localeCompare(b.name));
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('doc','var(--c-calendario)','var(--c-calendario-soft)')}<h2>Documenti personali</h2></div><button class="btn primary" onclick="openPersonalDocForm()">+ Aggiungi documento</button></div>
    <div class="section-label">Carta d'identità, passaporto, patente: le scadenze appaiono anche in Panoramica e nel Calendario.</div>
    ${docs.length? docs.map(p=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(p.type)}</span><div class="item-title">${esc(p.title||p.type)}</div><div class="item-meta">${p.number?('N. '+esc(p.number)+' · '):''}${p.expiryDate?('Scade il '+fmtD(p.expiryDate)):'Nessuna scadenza impostata'}</div>${p.note?`<div class="item-desc">${esc(p.note)}</div>`:''}${tagsChips(p.tags)}</div>
        <div class="item-actions"><button class="btn small ghost" onclick="openPersonalDocForm('${p.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo documento?', ()=>deletePersonalDoc('${p.id}'))">Elimina</button></div>
      </div>
      ${p.files&&p.files.length?`<div class="files-row">${p.files.map((f)=>`<span class="file-chip">📎 <a href="#" onclick="openAttachment('${encodeURIComponent(f.path)}'); return false;">${esc(f.name)}</a></span>`).join('')}</div>`:''}
      </div>`).join('') : `<div class="empty">Nessun documento personale archiviato.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Rubrica contatti utili</h2><button class="btn primary" onclick="openContactForm()">+ Aggiungi contatto</button></div>
    ${contacts.length? contacts.map(c=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(c.category)}</span><div class="item-title">${esc(c.name)}</div>${c.phone?`<div class="item-meta">📞 ${esc(c.phone)}</div>`:''}${c.note?`<div class="item-desc">${esc(c.note)}</div>`:''}</div>
        <div class="item-actions"><button class="btn small ghost" onclick="openContactForm('${c.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo contatto?', ()=>deleteContact('${c.id}'))">Elimina</button></div>
      </div></div>`).join('') : `<div class="empty">Nessun contatto salvato.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Beni importanti</h2><button class="btn primary" onclick="openAssetForm()">+ Aggiungi bene</button></div>
    <div class="section-label">Elettrodomestici, mobili o altri acquisti importanti. Il costo totale somma il prezzo d'acquisto e le spese del Salvadanaio che hanno la stessa etichetta.</div>
    ${state.assets.length? state.assets.map(a=>{
      const linked = state.expenses.filter(e=>(e.tags||[]).includes(a.name));
      const linkedTotal = linked.reduce((s,e)=>s+e.amount,0);
      const total = (Number(a.purchasePrice)||0) + linkedTotal;
      return `<div class="item"><div class="item-top">
        <div><div class="item-title">${esc(a.name)}</div><div class="item-meta">${a.purchaseDate?('Acquistato il '+fmtD(a.purchaseDate)+' · '):''}Prezzo: ${euro(a.purchasePrice)}${linked.length?(' · +'+linked.length+' spesa/e collegate'):''}</div>${a.note?`<div class="item-desc">${esc(a.note)}</div>`:''}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="text-align:right;"><div class="item-meta">Costo totale</div><div style="font-weight:700;">${euro(total)}</div></div>
          <button class="btn small ghost" onclick="openAssetForm('${a.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo bene?', ()=>deleteAsset('${a.id}'))">Elimina</button>
        </div>
      </div></div>`;
    }).join('') : `<div class="empty">Nessun bene tracciato. Aggiungi un elettrodomestico o un mobile importante per vederne il costo totale nel tempo.</div>`}
  </div>`;
}
function openPersonalDocForm(id){
  const p = id ? state.personalDocs.find(x=>x.id===id) : {title:'',type:PDOC_TYPES[0],number:'',expiryDate:'',note:'',files:[],tags:[]};
  openModal(`
    <h3>${id?'Modifica documento':'Nuovo documento personale'}</h3>
    <div class="field"><label>Tipo</label><select id="f_type">${PDOC_TYPES.map(t=>`<option ${p.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label>Titolo (opzionale, es. "Mia carta d'identità")</label><input id="f_title" value="${esc(p.title||'')}"></div>
    <div class="field-row"><div class="field"><label>Numero documento</label><input id="f_number" value="${esc(p.number||'')}"></div><div class="field"><label>Scadenza</label><input type="date" id="f_expiryDate" value="${p.expiryDate||''}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(p.note||'')}</textarea></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((p.tags||[]).join(', '))}"></div>
    <div class="field"><label>Foto / scansione</label><input type="file" id="f_files" multiple accept="image/*,.pdf">
      <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${p.files&&p.files.length?p.files.length+' file già allegati':'Nessun file allegato'}</div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="savePersonalDoc('${id||''}')">Salva</button></div>
  `);
}
async function savePersonalDoc(id){
  pushUndo();
  const newFiles = await readFiles(document.getElementById('f_files').files);
  let item = id ? state.personalDocs.find(x=>x.id===id) : {id:uid(), files:[]};
  item.type=val('f_type'); item.title=val('f_title'); item.number=val('f_number'); item.expiryDate=val('f_expiryDate'); item.note=val('f_note'); item.tags=parseTags(val('f_tags'));
  item.files = (item.files||[]).concat(newFiles);
  if(!id) state.personalDocs.push(item);
  syncLinkedEvent('persdoc-'+item.id, item.expiryDate, 'Scadenza '+(item.title||item.type), 'Documento personale');
  logActivity(id?'edited':'added','personalDoc', item.title||item.type);
  closeModal(); saveState(); toast('Documento salvato.');
}
function deletePersonalDoc(id){
  pushUndo();
  const p = state.personalDocs.find(x=>x.id===id); if(!p) return;
  trashItem('personalDoc', p, p.title||p.type);
  state.personalDocs=state.personalDocs.filter(x=>x.id!==id); removeLinkedEvent('persdoc-'+id); saveState();
}
function openContactForm(id){
  const c = id ? state.contacts.find(x=>x.id===id) : {name:'',category:CONTACT_CATS[0],phone:'',note:''};
  openModal(`
    <h3>${id?'Modifica contatto':'Nuovo contatto'}</h3>
    <div class="field"><label>Nome</label><input id="f_name" value="${esc(c.name||'')}"></div>
    <div class="field-row"><div class="field"><label>Categoria</label><select id="f_category">${CONTACT_CATS.map(cc=>`<option ${c.category===cc?'selected':''}>${cc}</option>`).join('')}</select></div><div class="field"><label>Telefono</label><input id="f_phone" value="${esc(c.phone||'')}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(c.note||'')}</textarea></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveContact('${id||''}')">Salva</button></div>
  `);
}
function saveContact(id){
  pushUndo();
  let item = id ? state.contacts.find(x=>x.id===id) : {id:uid()};
  item.name=val('f_name'); item.category=val('f_category'); item.phone=val('f_phone'); item.note=val('f_note');
  if(!id) state.contacts.push(item);
  logActivity(id?'edited':'added','contact', item.name);
  closeModal(); saveState();
}
function deleteContact(id){
  pushUndo();
  const c = state.contacts.find(x=>x.id===id); if(!c) return;
  trashItem('contact', c, c.name);
  state.contacts=state.contacts.filter(x=>x.id!==id); saveState();
}
function openAssetForm(id){
  const a = id ? state.assets.find(x=>x.id===id) : {name:'',purchasePrice:'',purchaseDate:'',note:''};
  openModal(`
    <h3>${id?'Modifica bene':'Nuovo bene'}</h3>
    <div class="field"><label>Nome (es. "Lavatrice cucina")</label><input id="f_name" value="${esc(a.name||'')}"></div>
    <div class="field-row"><div class="field"><label>Prezzo d'acquisto</label><input type="number" step="0.01" id="f_purchasePrice" value="${a.purchasePrice||''}"></div><div class="field"><label>Data acquisto</label><input type="date" id="f_purchaseDate" value="${a.purchaseDate||''}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(a.note||'')}</textarea></div>
    <div class="notice">Per collegare una spesa futura (es. una riparazione), aggiungila in Salvadanaio con l'etichetta "${esc(a.name||'nome del bene')}" — verrà sommata automaticamente qui.</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveAsset('${id||''}')">Salva</button></div>
  `);
}
function saveAsset(id){
  pushUndo();
  let item = id ? state.assets.find(x=>x.id===id) : {id:uid()};
  item.name=val('f_name'); item.purchasePrice=val('f_purchasePrice'); item.purchaseDate=val('f_purchaseDate'); item.note=val('f_note');
  if(!id) state.assets.push(item);
  logActivity(id?'edited':'added','asset', item.name);
  closeModal(); saveState();
}
function deleteAsset(id){
  pushUndo();
  const a = state.assets.find(x=>x.id===id); if(!a) return;
  trashItem('asset', a, a.name);
  state.assets=state.assets.filter(x=>x.id!==id); saveState();
}

// ===== IMPOSTAZIONI =====
let familyQrScanner = null;
async function showFamilyInvite(){
  try{
    const invite = await taccuinoDB.createFamilyInvite();
    if(!invite?.code) throw new Error('Invito non valido');
    openModal(`
      <h3>Aggiungi familiare</h3>
      <div class="section-label">Mostra questo QR code all'altra persona. L'invito vale 24 ore.</div>
      <div id="familyQrCode" class="family-qr-code"></div>
      <div class="family-code">Codice: <strong>${esc(invite.code)}</strong></div>
      <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Chiudi</button></div>
    `);
    new QRCode(document.getElementById('familyQrCode'), {text:`taccuino-family:${invite.code}`, width:220, height:220, colorDark:'#051923', colorLight:'#ffffff'});
  }catch(e){ toast('Impossibile creare l’invito. Esegui prima la migrazione famiglia su Supabase.'); }
}
async function joinFamilyWithCode(code){
  const cleanCode = String(code||'').replace(/^taccuino-family:/i,'').trim();
  if(!cleanCode){ toast('Scansiona un QR code valido.'); return; }
  try{
    await stopFamilyScanner();
    await taccuinoDB.joinFamily(cleanCode);
    closeModal();
    toast('Sei entrato nel nucleo familiare. Aggiorno i dati condivisi.');
    setTimeout(()=>location.reload(), 700);
  }catch(e){ toast(e.message||'Invito non valido o scaduto.'); }
}
async function startFamilyScanner(){
  if(typeof Html5Qrcode==='undefined'){ toast('Scanner QR non disponibile. Controlla la connessione.'); return; }
  try{
    familyQrScanner = new Html5Qrcode('familyQrReader');
    await familyQrScanner.start({facingMode:'environment'}, {fps:10, qrbox:{width:240,height:240}}, text=>joinFamilyWithCode(text));
  }catch(e){ toast('Non riesco ad aprire la fotocamera per leggere il QR.'); }
}
async function stopFamilyScanner(){
  if(!familyQrScanner) return;
  try{ await familyQrScanner.stop(); familyQrScanner.clear(); }catch(e){ /* scanner già fermo */ }
  familyQrScanner = null;
}
function showJoinFamily(){
  openModal(`
    <h3>Unisciti a una famiglia</h3>
    <div class="section-label">Inquadra il QR code dell'altra persona oppure inserisci il codice manualmente.</div>
    <div id="familyQrReader" class="family-qr-reader"></div>
    <div class="field"><label>Codice invito</label><input id="familyInviteCode" placeholder="es. A1B2C3D4E5F6"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="joinFamilyWithCode(val('familyInviteCode'))">Unisciti</button></div>
  `);
  startFamilyScanner();
}
function renderSettings(){
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('admin','var(--primary)','var(--c-calendario-soft)')}<h2>Account</h2></div></div>
    <div class="section-label">Il tuo accesso è protetto dalla tua email e password. Se in famiglia siete in più persone, ognuno dovrebbe creare il proprio account invece di condividere questo — i dati restano separati e privati per ciascuno.</div>
    <button class="btn subtle" onclick="logout()">Esci dall'account</button>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Nucleo familiare</h2></div>
    <div class="section-label">Condividi il taccuino con una persona di fiducia. Entrambi dovete usare account separati; dopo l'unione vedrete gli stessi dati.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn primary" onclick="showFamilyInvite()">Aggiungi familiare</button><button class="btn subtle" onclick="showJoinFamily()">Unisciti a una famiglia</button></div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Assistente AI</h2>${aiAvailable?'<span class="tag" style="background:var(--c-salute-soft);color:var(--c-salute);border-color:transparent;">Collegata</span>':'<span class="tag">Non collegata</span>'}</div>
    <div class="section-label">Scegli il servizio AI da usare con il robot in basso a destra. La chiave viene salvata solo su questo dispositivo e non viene inviata a Supabase.</div>
    <div class="field-row">
      <div class="field"><label>Provider</label><select id="set_aiProvider" onchange="updateAIProvider(this.value)">
        <option value="gpt" ${aiConfig.provider==='gpt'?'selected':''}>GPT / OpenAI</option>
        <option value="copilot" ${aiConfig.provider==='copilot'?'selected':''}>Copilot / GitHub Models</option>
        <option value="claude" ${aiConfig.provider==='claude'?'selected':''}>Claude / Anthropic</option>
        <option value="gemini" ${aiConfig.provider==='gemini'?'selected':''}>Gemini / Google</option>
        <option value="mistral" ${aiConfig.provider==='mistral'?'selected':''}>Mistral</option>
        <option value="grok" ${aiConfig.provider==='grok'?'selected':''}>Grok / xAI</option>
        <option value="custom" ${aiConfig.provider==='custom'?'selected':''}>Altro endpoint compatibile</option>
      </select></div>
      <div class="field"><label>Modello</label><input id="set_aiModel" value="${esc(aiConfig.model)}" placeholder="Nome del modello"></div>
    </div>
    <div class="field"><label>Endpoint API</label><input id="set_aiEndpoint" value="${esc(aiConfig.endpoint)}" placeholder="https://..."></div>
    <div class="field"><label>Chiave API</label><input id="set_aiKey" type="password" value="${esc(aiConfig.apiKey)}" autocomplete="off" placeholder="Incolla la chiave del provider"></div>
    <button class="btn primary" onclick="saveAIConfig()">Collega AI</button>
    <div class="section-label" style="margin-top:8px;">Copilot richiede un token GitHub Models. L'accesso diretto dal dispositivo può essere bloccato dal provider: in quel caso serve un endpoint proxy personale.</div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Blocco rapido</h2></div>
    <div class="section-label">Un livello extra oltre all'account: utile se presti il telefono a qualcuno per un attimo.</div>
    <div class="field-row">
      <div class="field"><label>Blocco con PIN</label><select id="set_pinEnabled" onchange="quickUpdateSetting('pinEnabled', this.value==='yes')">
        <option value="yes" ${state.settings.pinEnabled?'selected':''}>Attivo</option>
        <option value="no" ${!state.settings.pinEnabled?'selected':''}>Disattivo</option>
      </select></div>
      <div class="field"><label>Blocco automatico dopo inattività (minuti, 0 = mai)</label><input type="number" min="0" id="set_autoLock" value="${state.settings.autoLockMinutes||0}" onchange="quickUpdateSetting('autoLockMinutes', Number(this.value)||0)"></div>
    </div>
    <div class="field"><label>Cambia PIN (4 cifre)</label>
      <div style="display:flex;gap:8px;">
        <input id="set_newPin" maxlength="4" inputmode="numeric" placeholder="es. 0584" style="flex:1;padding:9px 11px;border:1px solid var(--line);border-radius:9px;">
        <button class="btn subtle" onclick="changePinFromSettings()">Aggiorna PIN</button>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Aspetto</h2></div>
    <div class="field"><label>Tema</label>
      <select id="set_theme" onchange="quickSetTheme(this.value)">
        <option value="light" ${state.settings.theme==='light'?'selected':''}>Chiaro</option>
        <option value="dark" ${state.settings.theme==='dark'?'selected':''}>Scuro</option>
      </select>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Il tuo profilo</h2></div>
    <div class="field"><label>Il tuo nome</label>
      <div style="display:flex;gap:8px;">
        <input id="set_ownerName" value="${esc(state.settings.ownerName||'')}" placeholder="Il tuo nome" style="flex:1;padding:9px 11px;border:1px solid var(--line);border-radius:9px;">
        <button class="btn subtle" onclick="quickUpdateSetting('ownerName', val('set_ownerName'))">Salva</button>
      </div>
      <div class="section-label" style="margin-top:6px;">Usato per personalizzare il briefing del mattino e le email di promemoria.</div>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Promemoria</h2></div>
    <div class="field-row">
      <div class="field"><label>Giorni di anticipo</label><input type="number" min="1" max="60" id="set_reminderDays" value="${state.settings.reminderDaysAhead}" onchange="quickUpdateSetting('reminderDaysAhead', Math.max(1,Number(this.value)||3))"></div>
      <div class="field" style="display:flex;align-items:flex-end;"><button class="btn subtle" style="width:100%;" onclick="sendRemindersNow()">Invia promemoria ora</button></div>
    </div>
    <div class="field"><label>Email a cui inviare i promemoria</label>
      <div style="display:flex;gap:8px;">
        <input id="set_reminderEmail" type="email" value="${esc(state.settings.reminderEmail||'')}" placeholder="tuo.indirizzo@email.it" style="flex:1;padding:9px 11px;border:1px solid var(--line);border-radius:9px;">
        <button class="btn subtle" onclick="quickUpdateSetting('reminderEmail', val('set_reminderEmail'))">Salva</button>
      </div>
    </div>
    <div class="notice">${state.settings.reminderEmail ? `Quando l'invio sarà attivo, le email arriveranno a <strong>${esc(state.settings.reminderEmail)}</strong>.` : 'Nessun indirizzo email impostato.'} L'invio vero e proprio non è ancora attivo in questa versione ibrida — arriverà con un prossimo aggiornamento.</div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Calendario</h2></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn subtle" onclick="exportICS()">Esporta calendario (.ics)</button>
      <label class="btn subtle" style="display:inline-flex;align-items:center;">Importa calendario (.ics)<input type="file" accept=".ics" style="display:none" onchange="importICS(this)"></label>
    </div>
    <div class="section-label" style="margin-top:8px;">Esporta per vedere i tuoi impegni su Google/Apple Calendar dal telefono, oppure importa un calendario esistente.</div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Cloud</h2></div>
    <div class="settings-section-title">Sincronizzazione</div>
    <div class="section-label">I tuoi dati vivono su Supabase, non su questo telefono: li ritrovi automaticamente se accedi da un altro dispositivo con lo stesso account. ${isOffline?'⚠️ Al momento sei offline: le modifiche restano su questo dispositivo e si sincronizzeranno alla riconnessione.':'✅ Sincronizzato.'}</div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Cestino</h2><span class="count">${state.trash.length} elementi</span></div>
    <div class="section-label">Gli elementi eliminati restano qui 30 giorni prima di essere rimossi definitivamente.</div>
    ${state.trash.length? [...state.trash].sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt)).map(t=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(TYPE_LABELS[t.type]||t.type)}</span><div class="item-title">${esc(t.label||'(senza titolo)')}</div><div class="item-meta">Eliminato il ${fmtD(t.deletedAt)}</div></div>
        <div class="item-actions">
          <button class="btn small subtle" onclick="restoreFromTrash('${t.id}')">Ripristina</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare definitivamente? Non potrai più recuperarlo.', ()=>permanentlyDeleteTrash('${t.id}'))">Elimina per sempre</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Il cestino è vuoto.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Registro attività</h2></div>
    ${state.activityLog.length? state.activityLog.slice(0,80).map(l=>`
      <div class="log-item"><div><div class="l-main">${esc(ACTION_LABELS[l.action]||l.action)} — ${esc(l.label||'')}</div><div class="l-type">${esc(TYPE_LABELS[l.type]||l.type)}</div></div><div class="due-badge">${fmtDT(l.ts)}</div></div>`).join('') : `<div class="empty">Nessuna attività registrata.</div>`}
  </div>
  `;
}

// ---------- STAMPA RIEPILOGO ----------
function openPrintSummary(){
  const upcoming = collectUpcoming().slice(0,20);
  const total = state.expenses.reduce((s,e)=>s+e.amount,0);
  const win = window.open('', '_blank');
  if(!win){ alert('Il browser ha bloccato la finestra di stampa. Consenti i popup per questa pagina.'); return; }
  win.document.write(`
    <html><head><title>Riepilogo — Il mio taccuino</title>
    <style>
      body{font-family:Georgia,serif;color:#051923;max-width:700px;margin:40px auto;padding:0 20px;}
      h1{font-size:24px;margin-bottom:4px;} h2{font-size:16px;border-bottom:1px solid #ccc;padding-bottom:6px;margin-top:28px;}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13.5px;}
      .muted{color:#888;font-size:11.5px;}
    </style></head><body>
    <h1>Il mio taccuino — riepilogo</h1>
    <div class="muted">Generato il ${fmtD(todayStr())}</div>
    <h2>Indirizzo</h2>
    <div>${esc(state.homeInfo.street||'')} ${esc(state.homeInfo.cap||'')} ${esc(state.homeInfo.city||'')}</div>
    <h2>Prossime scadenze</h2>
    ${upcoming.map(u=>`<div class="row"><span>${esc(u.title)} — ${esc(u.sub)}</span><span>${fmtD(u.date)}</span></div>`).join('') || '<div class="muted">Nessuna scadenza.</div>'}
    <h2>Salute — voci recenti</h2>
    ${[...state.health].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,15).map(h=>`<div class="row"><span>${esc(h.title||h.cat)} (${esc(h.cat)})${h.med?' — '+esc(h.med):''}</span><span>${fmtD(h.date)}</span></div>`).join('') || '<div class="muted">Nessuna voce.</div>'}
    <h2>Documenti personali</h2>
    ${state.personalDocs.map(p=>`<div class="row"><span>${esc(p.title||p.type)}</span><span>${p.expiryDate?fmtD(p.expiryDate):''}</span></div>`).join('') || '<div class="muted">Nessun documento.</div>'}
    <h2>Auto</h2>
    ${state.cars.map(c=>`<div class="row"><span>${esc(c.name)} ${c.plate?('· '+esc(c.plate)):''}</span><span>${c.km?Number(c.km).toLocaleString('it-IT')+' km':''}</span></div>`).join('') || '<div class="muted">Nessuna auto.</div>'}
    <h2>Spese totali</h2>
    <div class="row"><span>Totale registrato</span><span><strong>${euro(total)}</strong></span></div>
    </body></html>
  `);
  win.document.close();
  setTimeout(()=>win.print(), 400);
}

// ---------- helpers ----------
function val(id){ const el=document.getElementById(id); return el?el.value:''; }
function esc(s){ if(s===undefined||s===null) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

setupAutoLock();
initApp();
