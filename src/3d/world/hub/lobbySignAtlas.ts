export const LOBBY_SIGN_COLUMNS = 2;
export const LOBBY_SIGN_ROWS = 5;

/** Keep a small gutter inside every tile so mipmaps cannot pull in neighbouring text. */
export function lobbySignUv(index: number, u: number, v: number): [number, number] {
  const column = index % LOBBY_SIGN_COLUMNS;
  const row = Math.floor(index / LOBBY_SIGN_COLUMNS);
  return [
    (column + 0.015 + u * 0.97) / LOBBY_SIGN_COLUMNS,
    1 - (row + 0.015 + (1 - v) * 0.97) / LOBBY_SIGN_ROWS,
  ];
}
