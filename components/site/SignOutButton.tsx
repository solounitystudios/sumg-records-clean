"use client";

import * as React from "react";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="w-full border border-white/10 px-4 py-3 text-left text-sm uppercase tracking-[0.3em] text-white/70 transition hover:border-white/20 hover:text-white disabled:opacity-50"
    >
      {isSigningOut ? "Signing Out..." : "Sign Out"}
    </button>
  );
}