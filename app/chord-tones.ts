const mod = (n: number) => ((n % 12) + 12) % 12;

/** Root, third/suspension, fifth, then explicit color and remaining chord tones.
 * Shared by the harmony scorer and player so a maj9 never becomes a dominant 9. */
export function chordTonesForQuality(root: number, quality: string): number[] {
  const minor = /^m(?!aj)/.test(quality);
  const diminished = quality.includes("dim");
  const halfDiminished = quality.includes("m7b5");
  const suspended = quality.includes("sus2") ? 2 : quality.includes("sus") ? 5 : null;
  const third = suspended ?? (minor || diminished ? 3 : 4);
  const fifth = diminished || halfDiminished || quality.includes("b5") || quality.includes("alt") ? 6 : quality.includes("#5") ? 8 : 7;
  const base = [0, third, fifth];
  const colors: number[] = [];
  const extension = /(?:7|9|11|13)/.test(quality) && !quality.includes("add") && !quality.includes("6/9");
  if (extension) base.push(diminished ? 9 : quality.includes("maj") ? 11 : 10);
  if (quality.includes("6")) colors.push(9);
  if (quality.includes("b9") || quality.includes("alt")) colors.push(1);
  else if (quality.includes("#9")) colors.push(3);
  else if (quality.includes("9")) colors.push(2);
  if (quality.includes("#11")) colors.push(6);
  else if (quality.includes("11")) colors.push(5);
  if (quality.includes("13")) colors.push(9);
  return [...new Set([...base.slice(0, 3), ...colors, ...base.slice(3)].map((tone) => mod(root + tone)))];
}
