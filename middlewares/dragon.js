import { createMiddleware } from "signalbox";
import uuid from "uuid/v1";
import actions from "../actions";
import { select } from "../reducers";

export const middleware = createMiddleware((before, after, cancel) => ({
  [cancel(actions.DRAGON_DROP)](store, action) {
    if (action.entity === "terminal" && !!action.id) {
      store.dispatch(actions.dragonDropTerminal(action.id));
      return true;
    }
  },

  [cancel(actions.DRAGON_GRAB_STATION)](store, action) {
    const stationId = action.station.id;
    const connectionId = uuid();
    const terminalId = uuid();

    store.dispatch(
      actions.createConnection({
        id: connectionId,
        sourceId: stationId,
        lineId: "Riverside" // todo: pick 1st empty line for this
      })
    );

    store.dispatch(
      actions.createTerminal({
        id: uuid(),
        connectionId,
        stationId,
        lineId: "Riverside" // todo: pick 1st empty line for this
      })
    );

    store.dispatch(
      actions.createTerminal({
        id: terminalId,
        connectionId,
        lineId: "Riverside" // todo: pick 1st empty line for this
      })
    );

    store.dispatch(actions.dragonGrabTerminal(terminalId));

    return true;
  },

  [cancel(actions.DRAGON_MOVE)](store, action) {
    const dragon = store.getState().get("dragon");
    const entity = dragon.get("entity");
    const id = dragon.get("id");

    if (entity === "station" && !!id) {
      store.dispatch(actions.dragonMoveStation(action.x, action.y, id));
      return true;
    }

    if (entity === "terminal" && !!id) {
      store.dispatch(actions.dragonMoveTerminal(action.x, action.y, id));
      return true;
    }

    return false;
  },

  [cancel(actions.DRAGON_CREATE_CONNECTION)](store, action) {
    const state = store.getState();

    const dragon = store
      .getState()
      .get("dragon")
      .toJS();

    const terminal = select("terminals")
      .from(state)
      .byId(dragon.id)
      .toJS();

    const connection = select("connections")
      .from(state)
      .byId(terminal.connectionId)
      .toJS();

    const lineId = connection.lineId;
    const sourceId = connection.sourceId;
    const destinationId = action.connection.destinationId;

    if (sourceId === destinationId) {
      // this has only fired because the mouse has re-entered the origin
      // station and obviously we don't want to connect the station to itself
      // so just cancel this completely
      return true;
    }

    // probably need to revisit this tbh cos like i dunno just feels a bit
    // messy creating a new connection instead of making the "pending" one
    // real by setting its destinationId
    store.dispatch(
      actions.createConnection({
        sourceId,
        destinationId,
        lineId
      })
    );

    return true;
  }
}));
