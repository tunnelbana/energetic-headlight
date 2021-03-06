import { createMiddleware } from "signalbox";
import uuid from "uuid/v1";
import actions from "../actions";
import { select } from "../reducers";

export const middleware = createMiddleware((cancel, before, after) => ({
  [before(actions.CREATE_PASSENGER)]: function inferPassengerProperties(
    store,
    action
  ) {
    if (!action.passenger.id) {
      action.passenger.id = uuid();
    }

    if (!action.gender.id) {
      action.gender.id = "circle";
    }
  },

  [after(actions.ALIGHT)]: function liveHappilyEverAfter(store, action) {
    const state = store.getState();
    const passenger = select("passengers")
      .from(state)
      .byId(action.passenger.id);
    const station = select("stations")
      .from(state)
      .byId(action.station.id);

    const passengerGender = passenger.get("genderId");
    const stationGender = station.get("genderId");
    const hasArrived = passengerGender === stationGender;

    if (hasArrived) {
      store.dispatch(
        actions.liveHappilyEverAfter({ passengerId: action.passenger.id })
      );
    }
  },

  [after(actions.ARRIVAL)]: function alightTrains(store, { journey }) {
    const state = store.getState();
    const trainPassengers = select("passengers")
      .from(state)
      .byTrainId(journey.trainId);

    if (trainPassengers.size > 0) {
      store.dispatch(
        actions.alight({
          passengerId: trainPassengers.first().get("id"),
          stationId: journey.destinationId
        })
      );
    }

    /*
    const platformPassengers = select("passengers")
      .from(state)
      .byStationId(journey.destinationId);
    if (platformPassengers.size > 0) {
      store.dispatch(
        actions.board({
          passengerId: platformPassengers.first().get("id"),
          trainId: journey.trainId
        })
      );
    }
    */
  }
}));
