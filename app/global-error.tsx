"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#000", color: "#fff", fontFamily: "sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 1.5rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "9px",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.2)",
              marginBottom: "1rem",
            }}
          >
            Error
          </p>
          <h1
            style={{
              fontSize: "clamp(3rem, 10vw, 6rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginBottom: "1.5rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.3)",
              maxWidth: "24rem",
              lineHeight: 1.7,
              marginBottom: "2.5rem",
            }}
          >
            An unexpected error occurred. Try again or return home.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.4)",
                fontSize: "10px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                padding: "0.75rem 2rem",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.4)",
                fontSize: "10px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                padding: "0.75rem 2rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Return Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
