import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('escapes script-breaking characters in untrusted structured data', () => {
    const output = serializeJsonLd({
      name: '</script><script>alert(1)</script>',
      description: 'A & B\u2028C',
    });

    expect(output).not.toContain('</script>');
    expect(output).toContain('\\u003c/script\\u003e');
    expect(output).toContain('\\u0026');
    expect(output).toContain('\\u2028');
    expect(JSON.parse(output)).toEqual({
      name: '</script><script>alert(1)</script>',
      description: 'A & B\u2028C',
    });
  });
});
