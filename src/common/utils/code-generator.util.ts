export function generateRepittCode(length: number = 9, groups: number = 3): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let repittCode = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    repittCode += alphabet[randomIndex];
  }
  
  const partLength = Math.floor(length / groups);
  const parts = [];
  let startIndex = 0;

  for (let i = 0; i < groups; i++) {
    const currentPartLength = (i === Math.floor(groups / 2)) 
      ? partLength + (length % groups) 
      : partLength;
      
    parts.push(repittCode.substring(startIndex, startIndex + currentPartLength));
    startIndex += currentPartLength;
  }

  return parts.join('-');
}
