import json, os

def test_dump(ui, sample_dir):
    ui.open(hash="#video_id=1")
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    data = ui.js("""(() => {
      const f = document.createElement('iframe'); document.body.appendChild(f);
      const base = new Set(Object.getOwnPropertyNames(f.contentWindow)); base.delete('AnnotationStore'); f.remove(); // the test harness (dirty_writes.js) defines it in every frame
      const out = [];
      for (const k of Object.getOwnPropertyNames(window)) {
        if (base.has(k)) continue;
        const d = Object.getOwnPropertyDescriptor(window, k);
        let v; try { v = d.get ? '(getter)' : d.value } catch (e) { v = undefined }
        const t = d.get ? 'getter' : typeof v;
        let ctor = null, keys = null;
        if (v && (t === 'object' || t === 'function')) { try { ctor = v.constructor && v.constructor.name; keys = Object.keys(v).length } catch (e) {} }
        out.push({ name: k, type: t, ctor, keys, enumerable: d.enumerable, writable: !!d.writable, configurable: d.configurable });
      }
      return out })()""")
    with open(os.environ["PROBE_OUT"], "w") as fh:
        json.dump(data, fh)
