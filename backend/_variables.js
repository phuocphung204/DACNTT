export const SOCKET_EVENTS = Object.freeze({
  NEW_NOTIFICATION: "new_notification",
  NEW_CHAT_MESSAGE: "new_chat_message",
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  IN_CHAT_REQUEST_PREFIX: (id) => `in_chat_request_${id}`,
});