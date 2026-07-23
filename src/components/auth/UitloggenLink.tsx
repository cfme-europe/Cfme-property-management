export default function UitloggenLink() {
  return (
    <form
      action="/uitloggen"
      method="post"
    >
      <button
        type="submit"
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md hover:bg-slate-100"
      >
        Uitloggen
      </button>
    </form>
  );
}
