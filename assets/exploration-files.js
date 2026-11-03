// Lazy revision-conditional exploration transport, using the existing Dropbox grant.
(function(){
'use strict';
    // Separate canonical exploration document: no backup payload or device-local journal.
    // Strict revision updates cannot recreate a remotely deleted file or overwrite another writer.
    const EXPLORATION_PATH = Today.use('dropbox-files').explorationPath;
    async function explorationCall(operation, body, revision, signal) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, {once:true});
      if (signal?.aborted) abort();
      const timeout = setTimeout(abort, 20000);
      const grant = localStorage.getItem('dropbox_refresh_token') || localStorage.getItem('dropbox_token');
      try {
        await Today.use('dropbox-files').ensureToken();
        if (grant !== (localStorage.getItem('dropbox_refresh_token') || localStorage.getItem('dropbox_token'))) return {ok:false, reason:'connection-changed'};
        const token = localStorage.getItem('dropbox_token');
        if (!token || !navigator.onLine || controller.signal.aborted) return {ok:false, reason:'unavailable'};
        if (operation === 'remove' && !revision) return {ok:false, reason:'revision-required'};
        let url, options;
        const headers = {Authorization:`Bearer ${token}`};
        if (operation === 'remove') {
          url = 'https://api.dropboxapi.com/2/files/delete_v2';
          headers['Content-Type'] = 'application/json';
          options = {body:JSON.stringify({path:EXPLORATION_PATH,parent_rev:revision})};
        } else {
          url = 'https://content.dropboxapi.com/2/files/' + (operation === 'read' ? 'download' : 'upload');
          const args = {path:EXPLORATION_PATH};
          if (operation === 'write') {
            args.mode = revision ? {'.tag':'update',update:revision} : 'add';
            args.autorename = false; args.strict_conflict = true; args.mute = true;
            headers['Content-Type'] = 'application/octet-stream';
          }
          headers['Dropbox-API-Arg'] = JSON.stringify(args);
          options = operation === 'write' ? {body} : {};
        }
        const result = await fetch(url, {method:'POST',headers,signal:controller.signal,...options});
        if (grant !== (localStorage.getItem('dropbox_refresh_token') || localStorage.getItem('dropbox_token'))) return {ok:false,reason:'connection-changed'};
        if (result.status === 401) {
          localStorage.setItem('dropbox_token_expired','1');
          Today.use('connections').renderConnections();
          return {ok:false,reason:'reconnect'};
        }
        if (!result.ok) {
          const error = result.status === 409 ? await result.text() : '';
          return {ok:false,reason:result.status === 409 ? 'conflict' : 'unavailable',notFound:/not_found/.test(error)};
        }
        if (operation === 'read') {
          const metadata = JSON.parse(result.headers.get('Dropbox-API-Result') || '{}');
          if (!metadata.rev) return {ok:false,reason:'missing-revision'};
          return {ok:true,rev:metadata.rev,text:await result.text()};
        }
        const metadata = await result.json();
        return {ok:true,rev:metadata.rev || metadata.metadata?.rev || null};
      } catch (_) { return {ok:false,reason:'unavailable',uncertain:operation !== 'read'}; }
      finally { clearTimeout(timeout); signal?.removeEventListener('abort',abort); }
    }

Today.define('exploration-files',{path:EXPLORATION_PATH,read:signal=>explorationCall('read',null,null,signal),write:(body,revision,signal)=>explorationCall('write',body,revision,signal),remove:(revision,signal)=>explorationCall('remove',null,revision,signal)});
})();
