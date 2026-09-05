// TODAY component runtime
// One deliberately small namespace for component APIs and delegated UI actions.
// Commands remain component-owned; this module only resolves ownership and DOM events.
(function initTodayRuntime(global) {
  'use strict';

  if (global.Today) return;

  const components = new Map();
  const actions = new Map();
  const listenedEvents = new Set();

  function define(name, api) {
    if (!name || typeof name !== 'string') throw new TypeError('Today.define requires a component name');
    if (!api || typeof api !== 'object') throw new TypeError(`Today.define(${name}) requires an API object`);
    if (components.has(name)) throw new Error(`TODAY component already defined: ${name}`);
    components.set(name, Object.freeze(api));
    return components.get(name);
  }

  function use(name) {
    const api = components.get(name);
    if (!api) throw new Error(`TODAY component is not available: ${name}`);
    return api;
  }

  function dispatch(event) {
    const element = event.target instanceof Element
      ? event.target.closest(`[data-today-${event.type}]`)
      : null;
    if (!element) return;

    const actionName = element.dataset[`today${event.type[0].toUpperCase()}${event.type.slice(1)}`];
    const handler = actions.get(`${event.type}:${actionName}`);
    if (handler) handler(event, element);
  }

  function register(eventType, actionName, handler) {
    if (!eventType || !actionName || typeof handler !== 'function') {
      throw new TypeError('Today.ui.register requires an event, action name, and handler');
    }
    const key = `${eventType}:${actionName}`;
    if (actions.has(key)) throw new Error(`TODAY UI action already registered: ${key}`);
    actions.set(key, handler);
    if (!listenedEvents.has(eventType)) {
      document.addEventListener(eventType, dispatch);
      listenedEvents.add(eventType);
    }
  }

  global.Today = Object.freeze({
    define,
    use,
    ui: Object.freeze({ register }),
  });
})(window);
