// Tolerant JSON parser, same behaviour as parseLoose in the reference app.
export function parseLoose(t){
  t = String(t || '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) { try { return JSON.parse(f[1]); } catch (e) {} }
  const a = t.search(/[\[{]/), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b+1)); } catch (e) {} }
  throw Object.assign(new Error('Could not parse reply'), { code: 'invalid_json' });
}
