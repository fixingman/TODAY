// Pure, lazy feedback policy. Sensitive reflection data never enters nudge context.
(function(root) {
'use strict';
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const key = value => JSON.stringify(stable(value));
// Synchronous SHA-256 for private source-version comparisons during render/merge.
// Digests are not anonymization or authentication. No raw source values are copied.
function fingerprint(text) {
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const input=new TextEncoder().encode(text), bytes=new Uint8Array(Math.ceil((input.length+9)/64)*64);
  bytes.set(input);bytes[input.length]=128;
  const view=new DataView(bytes.buffer);view.setUint32(bytes.length-8,Math.floor(input.length/0x20000000));view.setUint32(bytes.length-4,(input.length*8)>>>0);
  const rotate=(n,b)=>(n>>>b)|(n<<(32-b)),w=new Uint32Array(64);
  for(let offset=0;offset<bytes.length;offset+=64){
    for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);
    for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=w[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+w[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10));}
    let [a,b,c,d,e,f,g,j]=h;
    for(let i=0;i<64;i++){
      const t1=(j+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+k[i]+w[i])|0;
      const t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))|0;
      j=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
    }
    [a,b,c,d,e,f,g,j].forEach((n,i)=>{h[i]=(h[i]+n)|0;});
  }
  return h.map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');
}
const stamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
function day(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return NaN;
  const n = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === value ? n : NaN;
}
function taskReadingFeedback(lines, today) {
  const now = day(today);
  const eligible = (Array.isArray(lines) ? lines : []).filter(row => row && row.surface === 'morning nudge'
    && !row.kind && ['landed', 'missed'].includes(row.reaction) && typeof row.text === 'string' && row.text.trim()
    && (now - day(row.date)) / 86400000 >= 1 && (now - day(row.date)) / 86400000 <= 14)
    .sort((a,b) => b.date.localeCompare(a.date) || String(b.reactedAt || '').localeCompare(String(a.reactedAt || '')) || a.text.localeCompare(b.text));
  return Object.fromEntries(['landed', 'missed'].map(reaction => [reaction,
    eligible.filter(row => row.reaction === reaction).slice(0,2).map(row => row.text.trim().slice(0,200))]));
}
function feedbackText(feedback) {
  return ['landed', 'missed'].map(reaction => feedback[reaction].length
    ? 'Recent morning lines the person marked "' + (reaction === 'landed' ? 'landed' : 'not really') + '":\n'
      + feedback[reaction].map(text => '- ' + text).join('\n') + '\n' : '').join('');
}
const feedbackInstruction = 'Earlier voted lines describe readings in earlier moments, not facts about today. Learn from what landed without copying it. A missed reading does not reject its task: a different reading may help when today\'s facts support it. No vote supplies a reason or a permanent preference.';
function dayContext(context) {
  return 'on days ' + context.replace(/^when /, '').replace(/^after finishing /, 'you finished ').replace(/^after handling /, 'you handled ')
    .replace(/recorded focus$/, 'a recorded focus session').replace(/a "have to"$/, 'a "have to" task');
}

function usableReflectionText(text, candidate, feelings) {
  const clean = text?.trim();
  if (!clean || clean.toLowerCase() === 'none') return null;
  if (clean.split(/\s+/).length > 40) return null;
  if (!/[.!?…]$/.test(clean)) return null;
  if (!/^(?:On evenings you reflected|In your evening reflections),/i.test(clean)) return null;
  if ((clean.match(/[.!?…](?:\s|$)/g) || []).length !== 1) return null;
  if (!candidate || !new RegExp('\\b' + candidate.feeling + '\\b', 'i').test(clean)) return null;
  const comparisonAt = clean.search(/\bmore often\b|\bmore common\b|\bshowed up more\b|\bstood out more\b/i);
  if (comparisonAt < 0) return null;
  if (/\b(?:caused|made you|because of|means you|should|try to|diagnos)/i.test(clean)) return null;
  const namedFeelings = feelings.filter(feeling =>
    new RegExp('\\b' + feeling + '\\b', 'i').test(clean));
  if (namedFeelings.length !== 1) return null;
  const normalize = value => String(value).toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const normalized = normalize(clean);
  const contexts = [value => value, dayContext];
  if (!contexts.some(format => {
    const moreAt = normalized.indexOf(normalize(format(candidate.more_context)));
    const lessAt = normalized.indexOf(normalize(format(candidate.less_context)));
    return moreAt >= comparisonAt && lessAt > moreAt && /\bthan\b/i.test(clean.slice(moreAt, lessAt));
  })) return null;
  return clean;
}

const wordingLabels = Object.freeze({ unclear:'hard to follow', formal:'too formal' });
function wordingEvent(r = {}) {
  return stamp(r.wordingAt) && Date.parse(r.wordingAt) >= Date.parse(r.createdAt)
    && [null,...Object.keys(wordingLabels)].includes(r.wordingReaction)
    ? { wordingReaction:r.wordingReaction, wordingAt:r.wordingAt } : null;
}
function latestWording(rows) {
  return rows.map(wordingEvent).filter(Boolean).sort((a,b)=>b.wordingAt.localeCompare(a.wordingAt)
    || Number(a.wordingReaction!==null)-Number(b.wordingReaction!==null)
    || String(a.wordingReaction).localeCompare(String(b.wordingReaction)))[0];
}
function wordingGuidance(records) {
  const current=new Map();
  for (const row of records.filter(r=>!r.expired && wordingEvent(r)))
    current.set(row.id,{...row,...latestWording([current.get(row.id),row])});
  const last=latestWording([...current.values()].filter(r=>r.wordingReaction));
  return last?.wordingReaction==='unclear'
    ? 'The person explicitly found earlier feeling wording hard to follow. Make the current two-action comparison direct and easy to follow; avoid elliptical references. Preserve its facts and uncertainty.'
    : last?.wordingReaction==='formal'
    ? 'The person explicitly found earlier feeling wording too formal. Use everyday, person-centered language rather than report-like phrasing. Preserve the supplied comparison; add no advice or emotional interpretation.' : '';
}
const claimKey = c => key([1, c.kind, c.feeling, c.more_context, c.less_context]);
function support(c, versions) {
  const dates = [...new Set([...c.more_dates, ...c.less_dates])].sort();
  return { more: c.more_dates.slice().sort(), less: c.less_dates.slice().sort(),
    versions: Object.fromEntries(dates.map(date => [date, versions[date]])) };
}
const supportKey = s => key(s);
const body = r => [1, r.generation, r.claim, r.support, r.text, r.seenThrough];
async function makeReading(candidate, versions, text, generation, now, wordingGuided) {
  const record = { generation, claim: claimKey(candidate), support: support(candidate, versions),
    text, seenThrough: Object.keys(versions).sort().at(-1) || '', createdAt: now,
    ...(wordingGuided ? {wordingGuided:true} : {}), reaction: null, reactedAt: '' };
  record.id = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key(body(record)))))]
    .map(byte => byte.toString(16).padStart(2,'0')).join('');
  return record;
}
function validRecord(r) {
  if (!r || typeof r !== 'object' || !/^[a-f0-9]{64}$/.test(r.id) || typeof r.generation !== 'string' || r.generation.length > 300
      || typeof r.claim !== 'string' || r.claim.length > 600 || !Number.isFinite(day(r.seenThrough))
      || (r.votedThrough !== undefined && !Number.isFinite(day(r.votedThrough)))
      || !stamp(r.createdAt) || ![null, 'landed', 'missed'].includes(r.reaction)
      || (r.reactedAt !== '' && !stamp(r.reactedAt)) || (r.reaction !== null && !r.reactedAt)
      || (r.wordingGuided !== undefined && r.wordingGuided !== true)) return false;
  if (r.expired === true) return !!r.reactedAt && !r.text && !r.support;
  if (typeof r.text !== 'string' || !r.text.trim() || r.text.length > 700) return false;
  const s = r.support;
  if (!s || !Array.isArray(s.more) || !Array.isArray(s.less) || !s.versions || Array.isArray(s.versions)
      || s.more.length < 4 || s.less.length < 4 || s.more.length + s.less.length > 30) return false;
  const dates = [...s.more, ...s.less];
  return new Set(dates).size === dates.length && Object.keys(s.versions).length === dates.length
    && dates.every(date => Number.isFinite(day(date)) && typeof s.versions[date] === 'string' && /^[a-f0-9]{64}$/.test(s.versions[date]))
    ;
}
function mergeRecords(local, remote, { today, generation, clearedAt = '', versions, sourcesReady = true } = {}) {
  const map = new Map(), now = day(today);
  for (const r of [...(Array.isArray(local) ? local.slice(0,120) : []), ...(Array.isArray(remote) ? remote.slice(0,120) : [])]) {
    if (!validRecord(r) || r.generation !== generation || (clearedAt && r.createdAt <= clearedAt)
        || Date.parse(r.createdAt) >= now + 86400000 || Date.parse(r.createdAt) < now - 29*86400000) continue;
    let expired = r.expired === true;
    if (!expired) {
      const changed = Object.entries(r.support.versions).filter(([date, version]) =>
        day(date) < now - 29*86400000 || (sourcesReady && (!versions || versions[date] !== version)));
      // Explicit withdrawal/edit removes the derived reading. Natural expiry may
      // retain only the user's bounded withholding decision, not source values.
      if (changed.some(([date]) => day(date) >= now - 29*86400000)) continue;
      if (changed.length) { if (!r.reactedAt) continue; expired = true; }
    }
    const row = { id:r.id, generation:r.generation, claim:r.claim,
      ...(expired ? { expired:true } : { support:JSON.parse(key(r.support)), text:r.text }), seenThrough:r.seenThrough,
      createdAt:r.createdAt, reaction:r.reaction, reactedAt:r.reactedAt,
      ...(r.votedThrough ? {votedThrough:r.votedThrough} : {}),
      ...(!expired && r.wordingGuided ? {wordingGuided:true} : {}),
      ...(!expired && Date.parse(r.wordingAt) < now+86400000 && wordingEvent(r) || {}) };
    const old = map.get(row.id);
    if (!old) map.set(row.id, row);
    else {
      const winning = row.reactedAt > old.reactedAt || (row.reactedAt === old.reactedAt &&
        (row.reaction === null || (old.reaction !== null && String(row.reaction) > String(old.reaction)))) ? row : old;
      const merged = { ...winning, createdAt: row.createdAt < old.createdAt ? row.createdAt : old.createdAt };
      Object.assign(merged, latestWording([old,row]) || {});
      if (row.wordingGuided || old.wordingGuided) merged.wordingGuided = true;
      if (row.expired || old.expired) {
        delete merged.text; delete merged.support; merged.expired = true;
        delete merged.wordingAt; delete merged.wordingReaction; delete merged.wordingGuided;
      }
      map.set(row.id, merged);
    }
  }
  const records = [...map.values()].sort((a,b) => Number(!!(b.reactedAt || b.wordingAt)) - Number(!!(a.reactedAt || a.wordingAt))
    || [b.reactedAt,b.wordingAt,b.createdAt].filter(Boolean).sort().at(-1).localeCompare([a.reactedAt,a.wordingAt,a.createdAt].filter(Boolean).sort().at(-1)) || a.id.localeCompare(b.id)).slice(0,60);
  while (records.length && key(records).length > 250000) records.pop();
  return records;
}
function latestClaim(candidate, records) {
  return records.filter(r => r.claim === claimKey(candidate) && r.reactedAt)
    .sort((a,b) => b.reactedAt.localeCompare(a.reactedAt) || Number(a.reaction !== null)-Number(b.reaction !== null) || a.id.localeCompare(b.id))[0];
}
function suppressed(candidate, records) {
  const last = latestClaim(candidate, records);
  if (!last || last.reaction !== 'missed') return false;
  const through = last.votedThrough || last.seenThrough;
  const more = candidate.more_dates.filter(date => date > through).length;
  const less = candidate.less_dates.filter(date => date > through).length;
  return more < 1 || less < 1;
}
function canonicalReading(candidate, versions, records) {
  const claim = claimKey(candidate), source = supportKey(support(candidate, versions));
  return records.filter(r => !r.expired && r.claim === claim && supportKey(r.support) === source)
    .sort((a,b) => b.reactedAt.localeCompare(a.reactedAt) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0] || null;
}
const api = Object.freeze({ key, fingerprint, stamp, taskReadingFeedback, feedbackText, feedbackInstruction,
  claimKey, makeReading, mergeRecords, suppressed, canonicalReading, dayContext, usableReflectionText, wordingLabels, wordingGuidance });
if (typeof module === 'object' && module.exports) module.exports = api;
else root.Today.define('feedback-policy', api);
})(typeof globalThis === 'object' ? globalThis : this);
