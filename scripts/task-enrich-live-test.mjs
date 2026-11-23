// Explicit, paid deployed-contract probe. Never imports an app store or calls a provider directly.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const TARGETS=Object.freeze({dev:'https://dev--today-here.netlify.app',production:'https://today-here.netlify.app'});
const REASONS=new Set(['provider-http','request-failed','provider-response','missing-answer','invalid-card-json',
  'invalid-card','output-limit','tool-limit','deadline','invalid-tool-response','unsupported-stop']);
export const LOOKUP='Find the official visitor opening hours for Nationalmuseum Stockholm.';
export const HELP=`Usage: npm run test:enrichment:live --prefix scripts -- [--target dev|production]
Or: node scripts/task-enrich-live-test.mjs --live [--target dev|production] [--output PATH]

One fixed public lookup through the deployed handler; no retries, personal tasks or Trello access.
Accepts a valid card or explicit no-result. A 502, timeout or invalid response fails.
Optional ANTHROPIC_API_KEY must be supplied through the approved test environment, never CLI/chat.
Otherwise uses deployment-side configuration. Missing credentials/version mismatch is blocked (exit 2), never a pass.
GET preflight: 5s. POST including body: 30s. Existing handler permits at most three provider turns.
Reports contain only version, status, timing and allowlisted failure categories; never keys or response prose.
This is a transport/response contract check, not retrieval quality or personal Trello/account acceptance.
`;

export function parseArgs(args){
  const options={live:false,target:'dev'};const seen=new Set();
  if(args.length===1&&args[0]==='--help')return {help:true};
  for(let i=0;i<args.length;i++){
    const flag=args[i];if(seen.has(flag))throw Error('invalid-options');seen.add(flag);
    if(flag==='--live')options.live=true;
    else if(flag==='--target'){options.target=args[++i];if(!Object.hasOwn(TARGETS,options.target))throw Error('invalid-target');}
    else if(flag==='--output'){options.output=args[++i];if(!options.output)throw Error('invalid-output');}
    else throw Error('invalid-options');
  }
  return options;
}

export function validResult(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.hasOwn(data,'error')||!Object.hasOwn(data,'card'))return null;
  if(data.card===null)return 'no-result';
  const c=data.card;
  if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.headline!=='string'||!c.headline.trim()||c.headline.length>40
    ||typeof c.icon!=='string'||c.icon.length>8||typeof c.body!=='string'||c.body.length>80)return null;
  if(c.cta!==null){
    if(!c.cta||typeof c.cta.label!=='string'||c.cta.label.length>10||typeof c.cta.href!=='string'||c.cta.href.length>500)return null;
    try{const u=new URL(c.cta.href);if(u.protocol!=='https:'||u.username||u.password)return null;}catch{return null;}
  }
  return 'card';
}

async function readBounded(response){
  if(!response.body)return '';
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>65536){await reader.cancel();throw Error('response-too-large');}chunks.push(value);}
  }finally{reader.releaseLock();}
  const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(buffer);
}
async function bounded(work,ms){
  const controller=new AbortController();let timer;
  try{return await Promise.race([work(controller.signal),new Promise((_,reject)=>{
    timer=setTimeout(()=>{reject(Error('request-timeout'));controller.abort();},ms);
  })]);}finally{clearTimeout(timer);controller.abort();}
}

export async function runProbe(options,{fetcher=fetch,key='',expectedVersion,timeoutMs=30000,preflightMs=5000,now=()=>Date.now()}={}){
  if(!options.live)throw Error('live-opt-in-required');
  if(!Object.hasOwn(TARGETS,options.target))throw Error('invalid-target');
  const origin=TARGETS[options.target];
  if(!/^\d+\.\d+\.\d+$/.test(expectedVersion||''))throw Error('expected-version-required');
  const report={schema:1,suite:'task-enrich-live',scope:'deployed web/provider response contract',
    target:options.target,origin,expectedVersion,capturedAt:new Date().toISOString(),
    credentialSource:key?'approved-environment-fallback':'deployment-only',lookupRequests:0};
  const started=now();
  const end=(status,result,extra={})=>({...report,status,result,...extra,durationMs:Math.max(0,now()-started)});
  let page;
  try{
    page=await bounded(async signal=>{
      const r=await fetcher(origin+'/',{signal,redirect:'error',cache:'no-store'});
      // Read only version metadata; never preserve the HTML.
      if(!r.ok)return {status:r.status};
      const html=await r.text();return {status:r.status,version:html.match(/const CHANGELOG = \{\s*["'](\d+\.\d+\.\d+)["']/)?.[1]};
    },preflightMs);
  }catch{return end('blocked','preflight-unavailable');}
  if(page.status!==200||page.version!==expectedVersion)
    return end('blocked','version-mismatch',{preflightStatus:page.status,...(page.version?{observedVersion:page.version}:{})});
  report.deployedVersion=page.version;
  try{
    const result=await bounded(async signal=>{
      report.lookupRequests++;
      const response=await fetcher(origin+'/.netlify/functions/task-enrich',{
        method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({taskText:LOOKUP,...(key?{apiKey:key}:{})}),
      });
      let data;
      try{data=JSON.parse(await readBounded(response));}
      catch(error){if(signal.aborted)throw Error('request-timeout');return {status:response.status,invalid:true,oversize:error.message==='response-too-large'};}
      return {status:response.status,data};
    },timeoutMs);
    const extra={httpStatus:result.status};
    if(result.invalid)return end('fail',result.oversize?'response-too-large':'invalid-json',extra);
    if(result.status!==200){
      if(result.status===400&&result.data?.error==='No API key — add your Claude key in Connections')
        return end('blocked','credential-required',extra);
      if(REASONS.has(result.data?.reason))extra.reason=result.data.reason;
      if(extra.reason==='provider-http'&&Number.isInteger(result.data.upstreamStatus)
        &&result.data.upstreamStatus>=100&&result.data.upstreamStatus<=599)extra.upstreamStatus=result.data.upstreamStatus;
      return end('fail','http-error',extra);
    }
    const accepted=validResult(result.data);
    return end(accepted?'pass':'fail',accepted||'invalid-card',extra);
  }catch(error){return end('fail',error?.message==='request-timeout'?'request-timeout':'request-failed');}
}

export async function main(args=process.argv.slice(2)){
  let options;try{options=parseArgs(args);}catch{console.error('Invalid live-test options. Use --help.');return 2;}
  if(options.help){console.log(HELP);return 0;}
  if(!options.live){console.error('No live request made. Explicit --live is required; use --help.');return 2;}
  const index=await readFile(join(ROOT,'index.html'),'utf8');
  const expectedVersion=index.match(/const CHANGELOG = \{\s*["'](\d+\.\d+\.\d+)["']/)?.[1];
  const output=options.output?resolve(options.output):join(ROOT,'.context','enrichment-live-'+Date.now(),'report.json');
  await mkdir(dirname(output),{recursive:true});
  // Reserve the file before any paid call; never overwrite previous evidence.
  await writeFile(output,'',{flag:'wx',mode:0o600});
  const report=await runProbe(options,{key:process.env.ANTHROPIC_API_KEY||'',expectedVersion});
  try{report.checkoutSha=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
  await writeFile(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(report));
  return report.status==='pass'?0:report.status==='blocked'?2:1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.exitCode=await main();}catch{console.error('Live test stopped; no private error data printed.');process.exitCode=2;}
}
