// TODAY — Info panel, poem display, weekly digest, AI reflection, and stat rendering.
// Inert until index.html calls window._startAbout() before init().
(function() {
  'use strict';
  // Policy-stamp accepted Sunday caches so stale backups cannot restore older wording.
  const WEEK_REFLECTION_POLICY = 'earned-v5';
  window._weekReflectionPolicy = WEEK_REFLECTION_POLICY;
  let started = false;
  window._startAbout = function() {
    if (started) return;
    started = true;

    let sundayReady = !localStorage.getItem('dropbox_token');
    let _sundayPending = null; // source key of the in-flight Sunday request; a re-render reuses it instead of paying twice
    document.addEventListener('today:memory-ready', event => {
      sundayReady = !!event.detail?.ready;
      if (sundayReady && $.infoPanel?.classList.contains('open')) renderInfoStats();
    });

    let _poolWordingUI, _poolWordingLoading;
    function _poolWordingLoad() {
      return _poolWordingLoading ||= Promise.all([import('./feedback-policy.js'),import('./pool-wording.js')])
        .then(() => _poolWordingUI = Today.use('pool-wording-ui').create({
          memory:() => appMemory,today:_localISO,save:() => {_saveMemory();if (localStorage.getItem('today_memory')!==JSON.stringify(appMemory)) throw new Error('Wording feedback was not saved');try {dropboxAutoSave();} catch (_) {}},
        })).catch(error => {_poolWordingLoading = null;throw error;});
    }
    const _poolWordingAPI = Today.define('pool-wording', {
      button(line) {
        const source=Today.use('sync-merge').poolReadingKey(line);
        return source ? '<button type="button" class="pool-wording-btn" data-today-click="pool-wording.open" data-pool-source="' + esc(source) + '" aria-expanded="false" aria-label="Wording feedback on this ' + (line.surface === 'Sunday reflection' ? 'Sunday reading' : 'morning observation') + '">wording</button>' : '';
      },
      source(surface) {
        return JSON.stringify([_localISO(),appMemory.clearedAt,appMemory.poolWordingClearedAt,
          (appMemory.taskOutcomes || []).map(row => JSON.stringify(row)).sort(),
          (appMemory.spokenLines || []).filter(row => row?.kind)
            .map(row => JSON.stringify([row.date,row.surface,row.kind,row.policy,row.surface===surface ? row.text : null,row.reaction,row.reactedAt,row.surface===surface ? row.wording : null])).sort(),
          Object.entries(appMemory.kindVerdicts || {}).sort(),
          Today.use('connections')._aiGetProvider(),Today.use('connections')._aiGetKey()]);
      },
      async prepare(surface) {
        if (!(appMemory.spokenLines || []).some(row => row.surface===surface && row.wording?.concern)) return '';
        let timer;
        try { return await Promise.race([_poolWordingLoad().then(ui => ui.guidance(surface)),
          new Promise(resolve => {timer=setTimeout(() => resolve(''),300);})]); }
        catch (_) {return '';}
        finally {clearTimeout(timer);}
      },
      retain(block,text) {return !!_poolWordingUI?.retain(block,text);},
      clear(persist = true) {
        const before=appMemory.spokenLines,oldClear=appMemory.poolWordingClearedAt;
        const clock=Today.use('sync-merge').poolWordingTime;
        const previous=Math.max(0,clock(appMemory.poolWordingClearedAt),...(appMemory.spokenLines || []).slice(-120).map(row => clock(row?.wording?.at)));
        appMemory.poolWordingClearedAt=new Date(Math.max(Date.now(),previous)).toISOString();
        appMemory.spokenLines=(appMemory.spokenLines || []).map(({wording,...row}) => row);
        if (persist) {
          try {_saveMemory();if (localStorage.getItem('today_memory')!==JSON.stringify(appMemory)) throw new Error('Wording feedback was not cleared');}
          catch (error) {appMemory.spokenLines=before;if (oldClear) appMemory.poolWordingClearedAt=oldClear;else delete appMemory.poolWordingClearedAt;throw error;}
          dropboxAutoSave();document.dispatchEvent(new Event('today:pool-wording-change'));
        }
      },
    });
    Today.ui.register('click','pool-wording.open',(event,button) => {
      event.preventDefault();event.stopPropagation();
      _poolWordingLoad().then(ui => ui.open(button)).catch(() => window._a11yAnnounce?.('Wording feedback is unavailable.'));
    });

    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    function toggleInfo() {
      const scrollY = window.scrollY; // Preserve scroll position
      const panel = $.infoPanel;
      const isOpening = !panel.classList.contains('open');
      if (isOpening) {
        panel.style.animation = ''; // clear repaint suppression so fadeIn plays (BUG-023)
        panel.classList.add('open');
      } else {
        panel.classList.remove('open');
      }
      $.configPanel.classList.remove('open');
      Today.use('connections')._endConnectionsPrivacyVisit();
      $.habitsPanel.classList.remove('open');
      $.memoryPanel?.classList.remove('open');
      Today.use('connections').syncActiveButtons();
      window.scrollTo(0, scrollY); // Restore scroll position

      if (!isOpening && typeof checkDayNudge === 'function') checkDayNudge(false);
      if (isOpening) {
        renderInfoStats();
        renderDailyPoem();
        const _ib = document.getElementById('infoBtn');
        if (_ib && _ib.classList.contains('btn-icon-week')) {
          _ib.classList.remove('btn-icon-week');
          localStorage.setItem('sunday_nudge_seen_' + _localISO(), '1');
          _pruneLS('sunday_nudge_seen_', 'sunday_nudge_seen_' + _localISO());
        }
        if (_ib && _ib.classList.contains('btn-icon-version')) {
          _ib.classList.remove('btn-icon-version');
          localStorage.setItem('today_seen_version', APP_VERSION);
          Today.use('memory').breatheVersionBadge();
        }
      }
    }



    function _poemOfTheDay() { return _poemForDate(); }

    function renderDailyPoem() {
      const el = document.getElementById('dailyPoem');
      const poem = _poemOfTheDay();
      if (!el || !poem) return; // corpus missing — static haiku in the markup stays
      el.innerHTML = _poemHTML(poem.text)
        + `<div class="poem-author">${esc(poem.author)}</div>`;
    }


    function _onPoemTap(event) {
      if (event?.detail === 0 || window.matchMedia('(hover: hover)').matches) { _shareDailyPoem(); return; }
      const block = document.getElementById('poemBlock');
      if (block && !block.classList.contains('revealed')) {
        block.classList.add('revealed');
        return;
      }
      _shareDailyPoem();
    }


    function _shareDailyPoem() {
      const poem = _poemOfTheDay();
      if (!poem) return;
      const dateStr = _localISO();
      const poemUrl = 'https://today-here.netlify.app/poem.html?date=' + dateStr;
      const text = poem.text + '\n— ' + poem.author;
      const btn = document.getElementById('poemShareBtn');

      if (btn) {
        btn.classList.add('clicked');
        setTimeout(() => btn.classList.remove('clicked'), 400);
      }
      function _showCopied() {
        if (!btn) return;
        btn.textContent = 'copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'share';
          btn.classList.remove('copied');
        }, 1800);
        if (window._a11yAnnounce) _a11yAnnounce('Poem link copied.');
      }
      if (navigator.share) {
        if (window._a11yAnnounce) _a11yAnnounce('Share sheet opened.');
        navigator.share({ title: poem.author + ' · TODAY', text, url: poemUrl }).catch(() => {});
        return;
      }
      _copyToClipboard(poemUrl, _showCopied);
    }

    function _copyToClipboard(text, onCopied) {
      const _ta = () => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          if (onCopied) onCopied();
        } catch (_) {}
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => { if (onCopied) onCopied(); }).catch(_ta);
      } else { _ta(); }
    }

    // Format focus time: "Xh Ym" if >= 60 minutes, "Xm" otherwise


    function _nudgeBlockShow(el, delayMs, forceAnimate) {
      const wasHidden = el.style.display === 'none';
      el.style.display = '';
      if (wasHidden || forceAnimate) {
        el.classList.remove('_nudge-entering');
        void el.offsetWidth; // force reflow so re-adding the class restarts the animation
        if (delayMs) el.style.animationDelay = delayMs + 'ms';
        else el.style.animationDelay = '';
        el.classList.add('_nudge-entering');
        el.addEventListener('animationend', () => {
          el.classList.remove('_nudge-entering');
          el.style.animationDelay = '';
        }, { once: true });
      }
    }

    function _reactionHTML(surface, wordingText) {
      if (typeof _memoryLineFor !== 'function') return '';
      const line = _memoryLineFor(surface, _localISO());
      if (!line) return '';
      const btn = (r, label) => '<button type="button" class="nudge-react-btn' + (line.reaction === r ? ' on' : '') + '"' +
        ' data-react="' + r + '" data-surface="' + esc(surface) + '" aria-pressed="' + (line.reaction === r) + '">' + label + '</button>';
      return '<div class="nudge-react' + (line.reaction ? ' open' : '') + '" role="group" aria-label="Did this land?">' +
        btn('landed', 'landed') + btn('missed', 'not really') + (wordingText === line.text ? _poolWordingAPI.button(line) : '') + '</div>' +
        _memoryMissReasonHTML(surface, line);
    }

    function _wireReactions(panel) {
      if (!panel || panel._reactWired) return;
      panel._reactWired = true;
      panel.addEventListener('click', e => {
        const reasonBtn = e.target.closest('.nudge-reason-btn');
        const reasonRow = e.target.closest('.nudge-reason');
        if (reasonRow && e.target.closest('.nudge-reason-skip')) {
          reasonRow.hidden = true;
          return;
        }
        if (reasonBtn && reasonRow) {
          const selected = _memorySetReactionReason(reasonRow.dataset.surface, _localISO(), reasonBtn.dataset.reason);
          reasonRow.querySelectorAll('.nudge-reason-btn').forEach(b => {
            const on = b.dataset.reason === selected;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', String(on));
          });
          if (typeof _haptic === 'function') _haptic();
          return;
        }
        const btn = e.target.closest('.nudge-react-btn');
        if (btn) {
          const now = _memoryReactToLine(btn.dataset.surface, _localISO(), btn.dataset.react);
          const group = btn.parentElement;
          group.querySelectorAll('.nudge-react-btn').forEach(b => {
            const on = b.dataset.react === now;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', String(on));
          });
          group.classList.toggle('open', true);
          const reasons = group.nextElementSibling;
          if (reasons?.classList.contains('nudge-reason')) {
            reasons.hidden = now !== 'missed';
            reasons.querySelectorAll('.nudge-reason-btn').forEach(b => {
              b.classList.remove('on');
              b.setAttribute('aria-pressed', 'false');
            });
          }
          if (typeof _haptic === 'function') _haptic();
          return;
        }
        const line = e.target.closest('.week-summary');
        if (!line) return;
        const group = line.parentElement && line.parentElement.querySelector('.nudge-react');
        if (group) {
          group.classList.toggle('open');
          const reasons = group.nextElementSibling;
          if (reasons?.classList.contains('nudge-reason') && !group.classList.contains('open')) reasons.hidden = true;
        }
      });
    }
    function _summaryHTML(text, surface) {
      const react = _reactionHTML(surface,text);
      return '<div class="week-summary' + (react ? ' reactable' : '') + '">' + esc(text) + '</div>' + react;
    }


    function _nudgeTextResolve(el) {
      el.classList.remove('_nudge-text-resolving');
      void el.offsetWidth;
      el.classList.add('_nudge-text-resolving');
      el.addEventListener('animationend', () => el.classList.remove('_nudge-text-resolving'), { once: true });
    }

    function renderInfoStats() {
      let _nudgeStagger = 0; // increments per visible block for staggered entrance
      _wireReactions($.infoPanel || document.getElementById('infoPanel'));
      // Pull stats from localStorage
      const focusMinsToday = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
      const streak = parseInt(localStorage.getItem('stat_streak') || '1');
      

      const totalDone = _doneTodayCount();
      const flowRate = Math.round(100 * (1 - Math.pow(0.8, totalDone)));

      const stats = [
        { val: streak + 'd', label: 'Streak', id: 'statStreakVal' },
        { val: flowRate + '%', label: 'Flow' },
        { val: _formatFocusTime(focusMinsToday), label: 'Focus' },
      ];

      document.getElementById('infoStats').innerHTML = stats.map(s => `
        <div class="info-stat">
          <div class="info-stat-val"${s.id ? ` id="${s.id}"` : ''}>${s.val}</div>
          <div class="info-stat-label">${s.label}</div>
        </div>`).join('');

      if (localStorage.getItem('_streak_milestone_pending') === '1') {
        localStorage.removeItem('_streak_milestone_pending');
        requestAnimationFrame(() => {
          const el = document.getElementById('statStreakVal');
          if (el) {
            el.classList.add('milestone-pulse');
            el.addEventListener('animationend', () => el.classList.remove('milestone-pulse'), { once: true });
          }
        });
      }


      const _history = safeJSON('today_daily_history', []);
      const _today   = _localISO();
      const _isSun   = new Date().getDay() === 0;

      // Build 7-day window ending today
      const _days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
        const letter = ['S','M','T','W','T','F','S'][d.getDay()];
        const entry = _history.find(e => e.date === iso);
        // Today: read live counters; prior days: use snapshot
        const tasks = iso === _today
          ? _doneTodayCount()
          : (entry ? entry.tasksDone : null);
        const focus = iso === _today
          ? parseInt(localStorage.getItem('stat_focus_mins_today') || '0')
          : (entry ? entry.focusMins : null);

        const _activeHabits = habitsList.filter(h => !h.archived);
        const habitsTotal = iso === _today
          ? _activeHabits.length
          : (entry ? (entry.habitsTotal || 0) : 0);
        const habitsKept = iso === _today
          ? _activeHabits.filter(h => (habitCompletions[h.id] || []).includes(_habitTodayISO())).length
          : (entry ? (entry.habitsKept || 0) : 0);
        _days.push({ iso, letter, tasks, focus, habitsKept, habitsTotal, isToday: iso === _today });
      }

      const _weekSection = document.getElementById('weekSection');
      const _hasData = _days.some(d => d.tasks !== null);
      if (_weekSection) {
        _weekSection.style.display = _hasData ? '' : 'none';
        if (_hasData && !_weekSection._moreWired) {
          _weekSection._moreWired = true;
          let _moreDismiss;
          _weekSection.addEventListener('touchstart', function() {
            clearTimeout(_moreDismiss);
            _weekSection.classList.add('touched');
            _moreDismiss = setTimeout(() => _weekSection.classList.remove('touched'), 2500);
          }, { passive: true });
        }
      }

      const _weekGrid = document.getElementById('weekGrid');
      if (_weekGrid) {

        const _gMax = Math.max(1, ..._days.map(d => d.tasks || 0));

        const _gTot = _days.reduce((s, d) => s + (d.tasks || 0), 0);
        const _maxT = Math.max(1, ..._days.map(d => d.tasks || 0));
        const _maxF = Math.max(1, ..._days.map(d => d.focus || 0));
        const _dayScore = d => {
          const t = (d.tasks || 0) / _maxT;                                       // task volume
          const f = (d.focus || 0) / _maxF;                                       // focus depth
          const h = d.habitsTotal > 0 ? (d.habitsKept || 0) / d.habitsTotal : 0;  // habit consistency
          return 0.4 * t + 0.35 * f + 0.25 * h;
        };

        let _yourDay = null;
        if (_gTot >= 4) {
          const _scored   = _days.map(d => ({ iso: d.iso, isToday: d.isToday, s: Math.round(_dayScore(d) * 1000) }));
          const _topScore = Math.max(..._scored.map(d => d.s));
          const _leaders  = _scored.filter(d => d.s === _topScore && d.s > 0);
          if (_leaders.length === 1 && !_leaders[0].isToday) _yourDay = _leaders[0].iso;
        }

        _weekGrid.innerHTML = _days.map(d => {
          const tStr = d.tasks === null ? '·' : String(d.tasks);
          const fStr = !d.focus ? '' : _formatFocusTime(d.focus);
          const cls  = d.tasks === null || d.tasks === 0 ? 'zero' : (d.isToday ? 'is-today' : '');

          const pct  = (d.tasks || 0) > 0 ? Math.max(14, Math.round((d.tasks / _gMax) * 100)) : 0;
          const fillCls = d.isToday ? 'week-col-bar-fill is-today' : 'week-col-bar-fill';
          const isWin  = d.iso === _yourDay;
          const dotCls = isWin ? 'week-col-dot on' : 'week-col-dot';
          let dotTitle = '';
          if (isWin) {
            const parts = [(d.tasks || 0) + ' done'];
            if (d.focus) parts.push(_formatFocusTime(d.focus) + ' focused');
            if (d.habitsTotal > 0) parts.push(d.habitsKept + '/' + d.habitsTotal + ' habits');
            dotTitle = ' title="Your best day · ' + parts.join(' · ') + '"';
          }
          return '<div class="week-col">' +
            '<div class="week-col-day">' + d.letter + '</div>' +
            '<div class="week-col-bar"><div class="' + fillCls + '" style="height:' + pct + '%"></div></div>' +
            '<div class="week-col-tasks ' + cls + '">' + tStr + '</div>' +
            '<div class="' + dotCls + '"' + dotTitle + '></div>' +
            '<div class="week-col-focus">' + fStr + '</div>' +
            '</div>';
        }).join('');
      }


      const _sundayBlock = document.getElementById('sundayBlock');
      if (_sundayBlock) {
        if (_isSun && _history.length > 0) {
          const _weekLabel = 'This week';
          const _cacheKey  = _aiCacheKey('week_reflection');

          const _week  = _days.filter(d => d.tasks !== null);
          const _reflectionStats = { days: _week, history: _history };

          const _weekInsight = _pickSundayInsight(_reflectionStats);
          _debugSundayAudit(_today);

          _nudgeBlockShow(_sundayBlock, _nudgeStagger++ * 60);
          const _weekPolicyKey = 'week_policy_' + _today;
          let _cached = localStorage.getItem(_cacheKey);
          const _weekPolicyCurrent = localStorage.getItem(_weekPolicyKey) === WEEK_REFLECTION_POLICY;
          if (!_weekPolicyCurrent) {
            // Discard cached pre-policy Sunday lines; they used a different evidence contract.
            localStorage.removeItem(_cacheKey);
            _pruneLS('week_policy_', _weekPolicyKey);
            localStorage.setItem(_weekPolicyKey, WEEK_REFLECTION_POLICY);
            _cached = null;
          }
          const _weekSurface = 'Sunday reflection';
          if (_cached) {
            _setSundayAuditGeneration('cache-hit', {
              kind: _weekInsight ? _weekInsight.kind : null,
            });
            if (!_poolWordingAPI.retain(_sundayBlock,_cached)) _sundayBlock.innerHTML =
              '<div class="week-label">' + _weekLabel + '</div>' +
              _summaryHTML(_cached, _weekSurface);
          } else if (!_weekInsight) {
            _setSundayAuditGeneration('blocked-no-insight');

            _sundayBlock.style.display = 'none';
          } else if (!Today.use('connections')._aiGetKey() || !navigator.onLine) {
            _setSundayAuditGeneration(Today.use('connections')._aiGetKey()
              ? 'blocked-offline' : 'blocked-no-ai-key', { kind: _weekInsight.kind });
            _sundayBlock.style.display = 'none';
          } else {
            _sundayBlock.innerHTML =
              '<div class="week-label">' + _weekLabel + '</div>' +
              '<div class="week-summary loading">reflecting…</div>';
            localStorage.setItem(_weekPolicyKey, WEEK_REFLECTION_POLICY);
            _pruneLS('week_policy_', _weekPolicyKey);
            const clear = appMemory.clearedAt, source = _sundaySourceKey();
            if (_sundayPending !== source) {
              _sundayPending = source;
              _fetchWeekReflection({ ..._reflectionStats, insight: _weekInsight }).then(text => {
                if (_sundayPending === source) _sundayPending = null;
                if (_today !== _localISO() || clear !== appMemory.clearedAt) return;
                if (text) {
                  _aiSurfaceSet('week_reflection', text);
                  const el = _sundayBlock.querySelector('.week-summary');
                  if (el) {
                    el.textContent = text; el.classList.remove('loading'); _nudgeTextResolve(el);
                    const react = _reactionHTML(_weekSurface,text);
                    if (react) { el.classList.add('reactable'); el.insertAdjacentHTML('afterend', react); }
                  }
                } else {
                  if (!_aiSurfaceGet('week_reflection')) _sundayBlock.style.display = 'none';
                }
              });
            }
          }
        } else {
          _sundayBlock.style.display = 'none';
        }
      }


      {
        const _themeKey = _aiCacheKey('week_theme_ai');
        const _weekKey  = _aiWeekKey();
        const _themeTriedKey = 'week_theme_tried_' + _weekKey;
        if (!_aiSurfaceGet('week_theme_ai') && !localStorage.getItem(_themeTriedKey) && _history.length > 0) {
          _fetchWeekThemeAI().then(text => {
            if (text) {
              _aiSurfaceSet('week_theme_ai', text);
              if ($.infoPanel && $.infoPanel.classList.contains('open')) renderInfoStats();
            } else if (navigator.onLine) {


              _pruneLS('week_theme_tried_', _themeTriedKey);
              localStorage.setItem(_themeTriedKey, '1');
            }
          });
        }
      }

      // Today’s saved line has a second home here after strip dismissal; both use the same retirement rule.
      const _nudgeBlock = document.getElementById('todayNudgeBlock');
      if (_nudgeBlock) {
        // Same rule as the strip, so the two homes never disagree.
        const _dayLine = Today.use('nudge').currentLine();
        if (_dayLine) {
          if (!_poolWordingAPI.retain(_nudgeBlock,_dayLine)) _nudgeBlock.innerHTML =
            '<div class="week-label">Today</div>' +
            _summaryHTML(_dayLine, 'morning nudge');
          _nudgeBlockShow(_nudgeBlock, _nudgeStagger++ * 60);
        } else {
          _nudgeBlock.style.display = 'none';
        }
      }


      const _noticedEl = document.getElementById('noticedBlock');
      if (_noticedEl && typeof _noticedLines === 'function') {
        const _nKey = 'noticed_lines_' + _today;
        const _prior = safeJSON(_nKey, []);
        const _fresh = _noticedLines(); // can't duplicate prior — show-once bookkeeping
        const _isSeason = e => e && typeof e === 'object' && e._season;
        let _all;
        if (_prior.some(_isSeason)) {

          _all = _prior.filter(_isSeason);
        } else if (_fresh.some(_isSeason)) {

          _all = _fresh.filter(_isSeason);
          _pruneLS('noticed_lines_', _nKey);
          localStorage.setItem(_nKey, JSON.stringify(_all));
        } else {
          _all = _prior.concat(_fresh).slice(0, 2);
          if (_fresh.length) {
            _pruneLS('noticed_lines_', _nKey);
            localStorage.setItem(_nKey, JSON.stringify(_all));
          }
        }
        if (_all.length) {
          const _noticedWasHidden = _noticedEl.style.display === 'none';
          _noticedEl.innerHTML = '<div class="week-label">Noticed</div>' +
            _all.map((l, i) => {
              const _cls = '"week-summary' + (i >= _prior.length ? ' _nudge-fresh' : '') + '"';
              if (_isSeason(l)) {
                return '<div class=' + _cls + '><span class="noticed-term">' + esc(l.term) + '</span>' + esc(l.line) + '</div>';
              }
              return '<div class=' + _cls + '>' + esc(l) + '</div>';
            }).join('');
          _nudgeBlockShow(_noticedEl, _nudgeStagger++ * 60);

          if (_fresh.length && !_noticedWasHidden) {
            _noticedEl.querySelectorAll('._nudge-fresh').forEach(el => _nudgeTextResolve(el));
          }
        } else {
          _noticedEl.style.display = 'none';
        }
      }
    }


    const SUNDAY_AUDIT_PREFIX = 'sunday_observation_audit_';

    function _debugSundayAudit(dateISO) {
      const date = dateISO || _localISO();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
       || isNaN(new Date(date + 'T12:00:00').getTime())) {
        throw new Error('Sunday audit date must be YYYY-MM-DD');
      }
      if (typeof _observationPoolAudit !== 'function'
       || typeof appMemory === 'undefined') return null;
      if (typeof _memoryStampOutcomeKeys === 'function') _memoryStampOutcomeKeys();

      const key = SUNDAY_AUDIT_PREFIX + date;
      const prior = safeJSON(key, null);
      const report = _observationPoolAudit(
        { outcomes: appMemory.taskOutcomes, todayISO: date },
        'sunday',
        { spokenLines: _sundaySpokenLines(date), kindVerdicts: appMemory.kindVerdicts, todayISO: date }
      );
      report.capturedAt = new Date().toISOString();
      report.runtime = {
        appVersion: typeof APP_VERSION === 'undefined' ? null : APP_VERSION,
        aiConfigured: !!Today.use('connections')._aiGetKey(),
        online: !!navigator.onLine,
        historyDays: safeJSON('today_daily_history', [])
          .filter(row => row && row.date && row.date <= date).length,
        cachePresent: !!localStorage.getItem('week_reflection_' + date),
        policy: localStorage.getItem('week_policy_' + date),
      };
      report.generation = prior && prior.generation
        ? prior.generation : { status: 'not-requested', updatedAt: report.capturedAt };
      localStorage.setItem(key, JSON.stringify(report));
      console.info('[Sunday observation audit ' + date + ']', report);
      return report;
    }

    function _setSundayAuditGeneration(status, detail, dateISO) {
      const date = dateISO || _localISO();
      let report = safeJSON(SUNDAY_AUDIT_PREFIX + date, null);
      if (!report) report = _debugSundayAudit(date);
      if (!report) return null;
      report.generation = {
        status,
        updatedAt: new Date().toISOString(),
        ...(detail || {}),
      };
      localStorage.setItem(SUNDAY_AUDIT_PREFIX + date, JSON.stringify(report));
      return report;
    }

    function _sundaySpokenLines(todayISO) {
      return (appMemory.spokenLines || []).filter(line =>
        !(line && line.surface === 'Sunday reflection' && line.date === todayISO
          && line.policy !== WEEK_REFLECTION_POLICY && !line.reaction));
    }

    function _pickSundayInsight(stats) {
      if (typeof _buildObservationCandidates !== 'function'
       || typeof _observationEligibleFor !== 'function'
       || typeof _observationNoveltyGate !== 'function'
       || typeof appMemory === 'undefined') {
        return null;
      }
      // An audit failure must leave Sunday free to abstain.
      try {
        const todayISO = _localISO();
        if (typeof _memoryStampOutcomeKeys === 'function') _memoryStampOutcomeKeys();
      const ranked = _buildObservationCandidates({
          days: stats.days, history: stats.history,
          outcomes: appMemory.taskOutcomes, todayISO,
          taskTexts: (typeof _memoryTaskTexts === 'function') ? _memoryTaskTexts() : {},
        });
        const eligible = _observationEligibleFor(ranked, 'sunday');
        // Current-policy or explicitly voted same-day lines block replacement; prior days still count for cooldown.
        const spokenLines = _sundaySpokenLines(todayISO);
        const knowledge = {
          spokenLines,
          kindVerdicts: appMemory.kindVerdicts,
          outcomes: appMemory.taskOutcomes,
          surface: 'sunday',
          todayISO,
        };
        const poolResult = _observationNoveltyGate(eligible, knowledge)[0] || null;
        if (poolResult) return poolResult;
        const hasSameDaySunday = spokenLines.some(
          l => l && l.date === todayISO && l.surface === 'Sunday reflection');
        if (hasSameDaySunday) return null;
        const fallback = (typeof _buildWeekShapeFallback === 'function')
          ? _buildWeekShapeFallback(appMemory.taskOutcomes, todayISO)
          : null;
        return fallback ? _observationNoveltyGate([fallback], knowledge)[0] || null : null;
      } catch (e) {
        console.warn('[sunday pool]', e && e.message);
        return null;
      }
    }

    function _sundaySourceKey() {
      return JSON.stringify([sundayReady,_poolWordingAPI.source('Sunday reflection')]);
    }

    async function _fetchWeekReflection(stats) {
      let current = () => true;
      try {
        if (!sundayReady) return null;
        const key = Today.use('connections')._aiGetKey();
        if (!key) {
          _setSundayAuditGeneration('blocked-no-ai-key');
          return null;
        }
        if (!navigator.onLine) {
          _setSundayAuditGeneration('blocked-offline');
          return null;
        }
        const insight = stats.insight;
        if (!insight) {
          _setSundayAuditGeneration('blocked-no-insight');
          return null;
        }
        const source = _sundaySourceKey(), provider = Today.use('connections')._aiGetProvider();
        const cache = _aiSurfaceGet('week_reflection');
        current = () => sundayReady && source === _sundaySourceKey()
          && cache === _aiSurfaceGet('week_reflection')
          && key === Today.use('connections')._aiGetKey()
          && provider === Today.use('connections')._aiGetProvider();
        const wording=await _poolWordingAPI.prepare('Sunday reflection');
        if (!current()) return null;
        _setSundayAuditGeneration('requesting', { kind: insight.kind });
        const userContent =
          'Verified observation type: ' + insight.kind + '\n' +
          'Supported insight: ' + insight.insight + '\n\n' +
          'Write the Sunday observation in clear everyday language. Preserve the supported insight instead of summarizing the evidence. ' +
          'Use the app\'s action words literally (for example, "let go" stays "let go"). ' +
          'Do not introduce any fact or interpretation not present above.' + wording;
        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: Today.use('connections')._aiGetProvider(),
            apiKey: key,
            messages: [{ role: 'user', content: userContent }],
            systemPrompt: 'One or two short sentences. No quotes. Under 24 words total. Second person — address the user as "you". Clear everyday language. Express the supported insight, not totals, ratios, percentages, sample sizes, or time windows. Preserve literal app actions such as "let go". Warmth, rhythm, dry wit, or one light metaphor are welcome only when they make the insight clearer. Confident voice, conservative claim. Never infer identity or personality and never claim causation beyond the supplied insight. If the insight cannot be made immediately understandable, reply exactly: none.',
          }),
        });
        if (!current()) return null;
        if (!res.ok) {
          _setSundayAuditGeneration('http-error', { kind: insight.kind, httpStatus: res.status });
          return null;
        }
        const text = _parseAIText(await res.json());
        if (!current()) return null;
        if (!text) {
          _setSundayAuditGeneration('empty-response', { kind: insight.kind });
          return null;
        }
        if (!_weekReflectionTextIsGrounded(text, insight)) {
          _setSundayAuditGeneration('rejected-output', { kind: insight.kind });
          return null;
        }
        // Carries the kind so the cross-surface cooldown sees what Sunday said.
        if (typeof _memoryRecordSpokenLine === 'function') {
          _memoryRecordSpokenLine('Sunday reflection', text, insight.kind, WEEK_REFLECTION_POLICY);
        }
        _setSundayAuditGeneration('accepted', { kind: insight.kind });
        return text;
      } catch (e) {
        if (current()) _setSundayAuditGeneration('exception', { errorName: e && e.name ? e.name : 'Error' });
        return null;
      }
    }


    async function _fetchWeekThemeAI() {
      try {
        const key = Today.use('connections')._aiGetKey();
        if (!key || !navigator.onLine) return null;



        const m = appMemory;
        const dailyHistory = (typeof safeJSON === 'function') ? safeJSON('today_daily_history', []) : [];
        // Migration guard: tasksAdded was cumulative before the fix; convert to per-day deltas if needed.
        if (dailyHistory.length > 0 && !dailyHistory[0].tasksAddedFixed) {
          dailyHistory.sort((a, b) => a.date.localeCompare(b.date));
          for (let _mi = dailyHistory.length - 1; _mi >= 0; _mi--) {
            const _mp = _mi > 0 ? dailyHistory[_mi - 1].tasksAdded : 0;
            dailyHistory[_mi].tasksAdded = Math.max(0, (dailyHistory[_mi].tasksAdded || 0) - _mp);
            dailyHistory[_mi].tasksAddedFixed = true;
          }
          localStorage.setItem('today_daily_history', JSON.stringify(dailyHistory));
        }
        const behavioralLines = [];

        // Peak hour
        if (m.preferences?.peakHour !== null && m.preferences?.peakHour !== undefined) {
          const h = m.preferences.peakHour;
          behavioralLines.push(`Peak completion hour: ${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`);
        }

        // Focus correlation
        const _focusDays = dailyHistory.filter(e => (e.focusMins || 0) > 0);
        const _noFocusDays = dailyHistory.filter(e => (e.focusMins || 0) === 0 && e.tasksDone > 0);
        if (_focusDays.length >= 5 && _noFocusDays.length >= 5) {
          const _fAvg = (_focusDays.reduce((s, e) => s + e.tasksDone, 0) / _focusDays.length).toFixed(1);
          const _nfAvg = (_noFocusDays.reduce((s, e) => s + e.tasksDone, 0) / _noFocusDays.length).toFixed(1);
          behavioralLines.push(`Focus-session days: avg ${_fAvg} tasks done; non-focus days: avg ${_nfAvg} tasks (${_focusDays.length} vs ${_noFocusDays.length} days)`);
        }

        // Habit → output correlation
        const _habitDays = dailyHistory.filter(e => e.habitsTotal > 0);
        if (_habitDays.length >= 7) {
          const _fullH = _habitDays.filter(e => e.habitsKept >= e.habitsTotal);
          const _partH = _habitDays.filter(e => e.habitsKept < e.habitsTotal);
          if (_fullH.length >= 3 && _partH.length >= 3) {
            const _fhAvg = (_fullH.reduce((s, e) => s + e.tasksDone, 0) / _fullH.length).toFixed(1);
            const _phAvg = (_partH.reduce((s, e) => s + e.tasksDone, 0) / _partH.length).toFixed(1);
            behavioralLines.push(`All habits kept → avg ${_fhAvg} tasks done; partial habits → avg ${_phAvg} tasks (${_fullH.length} vs ${_partH.length} days)`);
          }
        }

        // Completion rate (added vs done)
        const _rateH = dailyHistory.filter(e => e.tasksAdded > 0);
        if (_rateH.length >= 5) {
          const _totalAdded = _rateH.reduce((s, e) => s + e.tasksAdded, 0);
          const _totalDone = _rateH.reduce((s, e) => s + e.tasksDone, 0);
          behavioralLines.push(`Completes ${Math.round(_totalDone / _totalAdded * 100)}% of tasks added (${_rateH.length} days)`);
        }


        const _lateHours = m.patterns?.lateAdditions || [];
        if (_lateHours.length >= 5) {
          const _latePct = Math.round(_lateHours.filter(h => h >= 14).length / _lateHours.length * 100);
          behavioralLines.push(`${_latePct}% of additions happen after 2pm`);
        }

        // Day-of-week pattern
        const _byDow = {};
        for (const e of dailyHistory) {
          const d = new Date(e.date).getDay();
          if (!_byDow[d]) _byDow[d] = { total: 0, count: 0 };
          _byDow[d].total += e.tasksDone || 0;
          _byDow[d].count++;
        }
        const _dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const _dowAvgs = Object.entries(_byDow)
          .filter(([,v]) => v.count >= 3)
          .map(([d, v]) => ({ day: _dowNames[d], avg: v.total / v.count }))
          .sort((a, b) => b.avg - a.avg);
        if (_dowAvgs.length >= 3) {
          behavioralLines.push(`Most productive days: ${_dowAvgs[0].day} (${_dowAvgs[0].avg.toFixed(1)}/day), ${_dowAvgs[1].day} (${_dowAvgs[1].avg.toFixed(1)}/day)`);
        }

        if (behavioralLines.length < 2) return null; // not enough behavioral signal


        const _pastIds = new Set((typeof pastTasks !== 'undefined' ? pastTasks : []).map(t => t.id));
        const _agingTasks = (typeof manualTasks !== 'undefined' ? manualTasks : [])
          .filter(t => !doneIds.has(t.id) && !_pastIds.has(t.id))
          .map(t => {
            const created = t.lastActive || t.createdAt || Today.use('connections')._getCreatedFromId(t.id);
            const ageDays = created ? Math.floor((Date.now() - created) / 86400000) : 0;
            const sessions = parseInt(t.focusSessions) || 0;
            return { text: t.text, ageDays, sessions };
          })
          .filter(t => t.ageDays >= 2)
          .sort((a, b) => b.ageDays - a.ageDays)
          .slice(0, 5)
          .map(t => {
            const signals = [t.ageDays + 'd old'];
            if (t.sessions > 0) signals.push(t.sessions + ' focus session' + (t.sessions > 1 ? 's' : ''));
            return '"' + t.text + '" (' + signals.join(', ') + ')';
          });

        const taskCtx = _agingTasks.length
          ? '\n\nAging tasks in flight this week:\n' + _agingTasks.join('\n')
          : '';

        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: Today.use('connections')._aiGetProvider(),
            apiKey: key,
            messages: [{ role: 'user', content:
              'Behavioral data (all stats are independent daily averages — timing patterns are not same-day pairs):\n' + behavioralLines.join('\n') +
              taskCtx + '\n\n' +
              'Name one genuine observation about your week — your rhythm, timing, or what\'s actually been in flight. ' +
              'You may reference a specific aging task if it illuminates a real pattern (e.g. something kept vs. avoided). ' +
              'Do NOT combine two timing stats into a same-day cause-effect claim — each is an independent aggregate. ' +
              'Ground it only in the data above, never invent. ' +
              'If nothing genuine stands out, reply with exactly: none.' }],
            systemPrompt: 'One sentence only, under 22 words. No quotes. Second person — address the user as "you". Use numerals for all numbers (3 not three). Plain, observational — rhythm, timing, or a concrete task that reveals something real.',
          }),
        });
        if (!res.ok) return null;
        const text = _parseAIText(await res.json());
        if (!text || /^none\.?$/i.test(text.trim())) return null;
        if (typeof _memoryRecordSpokenLine === 'function') _memoryRecordSpokenLine('week theme', text);
        return text;
      } catch (e) {
        return null;
      }
    }


    document.addEventListener('click', function(e) {
      const block = document.getElementById('poemBlock');
      if (block && block.classList.contains('revealed') && !block.contains(e.target)) {
        block.classList.remove('revealed');
      }
    });

    if (typeof CHANGELOG !== 'undefined' && typeof HISTORY_SHOWN !== 'undefined') {
      const _clPanel  = document.getElementById('changelogPanel');
      const _versions = Object.keys(CHANGELOG);
      const _shown    = _versions.slice(0, 1 + HISTORY_SHOWN);
      if (_clPanel) {
        _clPanel.innerHTML = _shown.map((v, i) => {
          if (i === 0) {
            const bullets = CHANGELOG[v].split(' | ').map(b =>
              `<div class="changelog-line"><span>${b}</span></div>`
            ).join('');
            return `<div class="changelog-entry">
              <span class="changelog-version">v${v}</span>
              <div class="changelog-entry-body">
                <span class="version-badge">CURRENT</span>
                <div class="changelog-text">${bullets}</div>
              </div>
            </div>`;
          }
          return `<div class="changelog-old">
            <span class="changelog-version">v${v}</span>
            <span class="changelog-text">${CHANGELOG[v].split(' | ')[0]}</span>
          </div>`;
        }).join('');
      }
    }

    if (window.Today) {
      Today.define('about', {
        toggleInfo,
        _poemOfTheDay,
        _onPoemTap,
        _shareDailyPoem,
        _copyToClipboard,
        renderInfoStats,
        _fetchWeekReflection,
        _pickSundayInsight,
        _debugSundayAudit,
        _reactionHTML,
      });
      Today.ui.register('click', 'about.toggle', toggleInfo);
      Today.ui.register('click', 'about.poem', _onPoemTap);
    }
    window._copyToClipboard = _copyToClipboard;
  };
})();
