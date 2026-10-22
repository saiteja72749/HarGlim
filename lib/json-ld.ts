export function serializeJsonLd(value: Record<string, unknown>): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError('JSON-LD value must be serializable');
  }

  return serialized.replace(/[<>&\u2028\u2029]/g, (character) => {
    switch (character) {
      case '<':
        return '\\u003c';
      case '>':
        return '\\u003e';
      case '&':
        return '\\u0026';
      case '\u2028':
        return '\\u2028';
      default:
        return '\\u2029';
    }
  });
}
