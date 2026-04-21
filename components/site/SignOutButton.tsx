export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST" className="w-full">
      <button
        type="submit"
        className="w-full border border-white/10 px-4 py-3 text-left text-sm uppercase tracking-[0.3em] text-white/70 transition hover:border-white/20 hover:text-white"
      >
        Sign Out
      </button>
    </form>
  );
}