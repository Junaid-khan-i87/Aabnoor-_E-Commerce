export function getShortProductName(name: string, maxLength = 64) {
  const cleanName = String(name || '').replace(/\s+/g, ' ').trim();
  const separators = [' | ', ' - ', ' -', ' - '];
  const separated = separators
    .map((separator) => cleanName.split(separator)[0]?.trim())
    .find((part) => part && part.length >= 8 && part.length < cleanName.length);
  const candidate = separated || cleanName;

  if (candidate.length <= maxLength) return candidate;

  const clipped = candidate.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  return `${clipped || candidate.slice(0, maxLength).trim()}...`;
}
