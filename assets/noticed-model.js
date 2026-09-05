// TODAY — pure threshold and calendar model for the About panel's Noticed surface.
(function initNoticedModel(global) {
  'use strict';

  const seasonMoments = Object.freeze([
    { date: '01-06', term: '小寒 · Minor Cold', line: 'The light is back — a minute more each day.' },
    { date: '01-20', term: '大寒 · Major Cold', line: 'Coldest weeks. The world is very still.' },
    { date: '02-04', term: '立春 · Start of Spring', line: 'Halfway between solstice and equinox. Spring is on its way.' },
    { date: '02-19', term: '雨水 · Rain Water', line: 'The thaw begins.' },
    { date: '03-06', term: '啓蟄 · Awakening of Insects', line: 'Something is waking underground.' },
    { date: '03-21', term: '春分 · Spring Equinox', line: 'Day and night in balance. The year tips into light.' },
    { date: '04-05', term: '清明 · Clear and Bright', line: 'The air is clear. Light is landing differently now.' },
    { date: '04-20', term: '穀雨 · Grain Rain', line: 'April rain, the long kind.' },
    { date: '05-06', term: '立夏 · Start of Summer', line: 'Summer starts by the old measure. Trees are finally green.' },
    { date: '05-21', term: '小満 · Grain Buds', line: 'Long evenings now. Light stays past dinner.' },
    { date: '06-06', term: '芒種 · Grain in Ear', line: 'The longest light before the solstice.' },
    { date: '06-21', term: '夏至 · Summer Solstice', line: "Midsummer — the year's longest day." },
    { date: '07-07', term: '小暑 · Minor Heat', line: 'The warmest weeks. Summer at its fullest.' },
    { date: '07-23', term: '大暑 · Major Heat', line: 'Peak summer. The days are already shortening.' },
    { date: '08-07', term: '立秋 · Start of Autumn', line: 'The sun pulls back. Autumn is on its way.' },
    { date: '08-23', term: '処暑 · End of Heat', line: 'Mornings have an edge to them now.' },
    { date: '09-08', term: '白露 · White Dew', line: 'Dew on the grass. The year is cooling.' },
    { date: '09-23', term: '秋分 · Autumnal Equinox', line: 'Day and night equal again. The year tips toward dark.' },
    { date: '10-08', term: '寒露 · Cold Dew', line: 'The leaves are turning. Cold mornings.' },
    { date: '10-23', term: "霜降 · Frost's Descent", line: 'First frosts. The year is giving in to winter.' },
    { date: '11-07', term: '立冬 · Start of Winter', line: 'The light is leaving quickly. Winter is here.' },
    { date: '11-22', term: '小雪 · Minor Snow', line: 'Snow possible any morning now.' },
    { date: '12-07', term: '大雪 · Major Snow', line: 'Dark midwinter. Almost at the stillest point of the year.' },
    { date: '12-21', term: '冬至 · Winter Solstice', line: "The year's shortest day. The light turns back tomorrow." },
  ]);

  function seasonMomentForDate(todayISO, southern = false) {
    const index = seasonMoments.findIndex(moment => moment.date === String(todayISO).slice(5));
    return index < 0 ? null : seasonMoments[(index + (southern ? 12 : 0)) % seasonMoments.length];
  }

  function habitMilestone(run) {
    return run >= 100 ? Math.floor(run / 50) * 50 : [50, 30, 14, 7].find(value => run >= value);
  }

  function focusMilestone(hours) {
    return hours >= 100 ? Math.floor(hours / 100) * 100 : [50, 25, 10].find(value => hours >= value);
  }

  function formatHour(hour) {
    return (hour > 12 ? hour - 12 : hour) + (hour >= 12 ? 'pm' : 'am');
  }

  if (global.Today) global.Today.define('noticed-model', {
    seasonMoments,
    seasonMomentForDate,
    habitMilestone,
    focusMilestone,
    formatHour,
  });
})(window);
