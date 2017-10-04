export const ADD_TRACK = "ADD_TRACK";
export const UPDATE_TRACK = "UPDATE_TRACK";

export function addTrack(track) {
  return {
    type: ADD_TRACK,
    track
  };
}

export function updateTrack(track) {
  return {
    type: UPDATE_TRACK,
    track
  };
}
