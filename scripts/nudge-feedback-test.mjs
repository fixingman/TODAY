// Exercise the prepared branch through the real nudge integration suite without
// enabling the production signal without adequate pickup evidence.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const extra of [[],['--missing-feedback-policy']]){
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./nudge-test.mjs',import.meta.url)),'--balanced-feedback',...extra],{encoding:'utf8',timeout:55000});
  if(result.status!==0){process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exit(1);}
}
console.log('Prepared balanced-feedback branch and missing-helper fallback pass the nudge integration suite. Production gate remains off awaiting activation evidence.');
