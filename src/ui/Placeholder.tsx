export function Placeholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">Noch nicht umgesetzt. Geplant in Meilenstein {milestone} (siehe PLAN.md).</p>
    </section>
  );
}
