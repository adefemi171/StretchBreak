import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createIPX } from 'ipx';

test('patched Sharp remains compatible with the Netlify IPX resize and format pipeline', async () => {
  assert.equal(sharp.versions.sharp, '0.35.4');
  const input = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#397a70' } }).png().toBuffer();
  const ipx = createIPX({ storage: { name: 'regression-fixture', getMeta: () => ({}), getData: () => input } });
  for (const format of ['png', 'webp', 'avif']) {
    const result = await ipx('fixture.png', { s: '2_2', f: format }).process();
    const metadata = await sharp(result.data).metadata();
    assert.equal(metadata.width, 2);
    assert.equal(metadata.height, 2);
    assert.ok(result.data.length > 0);
  }
});
