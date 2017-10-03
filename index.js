import { bindActionCreators } from "redux";

exports.createApp = (store, actions, middlewares, selectors) => {
  const actionCreators = {};
  const actionTypes = {};
  Object.keys(actions).forEach(key => {
    if (typeof actions[key] === 'function') {
      actionCreators[key] = actions[key];
    } else if (typeof actions[key] === 'string') {
      actionTypes[key] = actions[key];
    }
  });

  const app = {};
  app.actions = actionTypes;
  app.dispatch = bindActionCreators(actionCreators, store.dispatch);
  app.select = selectors.bindStore(store);
  app.before = (actionType, m) => middlewares.befores[actionType].push(m);
  app.after = (actionType, m) => middlewares.afters[actionType].push(m);
  app.cancel = (actionType, m) => middlewares.cancels[actionType].push(m);

  return app;
};

exports.createMiddleware = cb => {
  const befores = {};
  const afters = {};
  const cancels = {};

  const middleware = store => {
    return next => action => {
      befores[action.type] &&
        befores[action.type].forEach(before => {
          before.call(null, store, action);
        });

      if (cancels[action.type]) {
        for (let cancel of cancels[action.type]) {
          const shouldCancel = cancel.call(null, store, action);
          if (shouldCancel === true) {
            return null;
          }
        }
      }

      const result = next(action);

      afters[action.type] &&
        afters[action.type].forEach(after => {
          after.call(null, store, action);
        });

      return result;
    };
  };

  const addBefore = actionType => {
    (befores[actionType] = befores[actionType] || []).push(undefined);
    return `before.${actionType}.${befores[actionType].length}`;
  };

  const addAfter = actionType => {
    (afters[actionType] = afters[actionType] || []).push(undefined);
    return `after.${actionType}.${afters[actionType].length}`;
  };

  const addCancel = actionType => {
    (cancels[actionType] = cancels[actionType] || []).push(undefined);
    return `cancel.${actionType}.${cancels[actionType].length}`;
  };

  let middlewares;

  if (typeof cb === 'function') {
    middlewares = cb.call(null, addBefore, addAfter, addCancel);
  } else if (typeof cb === 'object') {
    middlewares = {};
    for (let m of cb) {
      for (let b in m.befores) {
        befores[b] = (befores[b] || []).concat(m.befores[b][0]);
      }
      for (let a in m.afters) {
        afters[a] = (afters[a] || []).concat(m.afters[a][0]);
      }
      for (let c in m.cancels) {
        cancels[c] = (cancels[c] || []).concat(m.cancels[c][0]);
      }
    }
  }

  Object.keys(middlewares).forEach(key => {
    const [, timing, actionType, index] = key.match(
      /^(before|after|cancel)\.(.*)+\.(\d+)$/
    );
    ({ before: befores, after: afters, cancel: cancels }[timing][actionType][index - 1] =
      middlewares[key]);
  });

  middleware.befores = befores;
  middleware.afters = afters;
  middleware.cancels = cancels;
  return middleware;
};


const defaultOptions = {
  stateAccessor(state, entity) {
    return state && state[entity];
  }
};

exports.createSelect = (selectors, options = defaultOptions) => {
  const select = entity => {
    return {
      from(state) {
        return new Proxy({}, {
          get(target, name) {
            const stateParam = options.stateAccessor(state, entity);
            return selectors[entity][name].bind(null, stateParam);
          }
        });
      }
    }
  };

  select.bindStore = store => {
    const boundSelect = {};

    for (let entity in selectors) {
      boundSelect[entity] = {};
      for (let name in selectors[entity]) {
        boundSelect[entity][name] = () => {
          const state = store.getState();
          const stateParam = options.stateAccessor(state, entity);
          return selectors[entity][name].call(null, stateParam);
        };
      }
    }
    return boundSelect;
  }

  return select;
}
