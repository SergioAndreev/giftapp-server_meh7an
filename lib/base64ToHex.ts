export const base64ToHex = (base64String: string) => {
  const raw = atob(base64String);
  let hex = "";
  for (let i = 0; i < raw.length; i++) {
    const hexByte = raw.charCodeAt(i).toString(16);
    hex += hexByte.length === 2 ? hexByte : "0" + hexByte;
  }
  return hex;
};
