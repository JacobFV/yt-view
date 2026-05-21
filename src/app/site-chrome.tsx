import Link from "next/link";

const productLinks = [
  { href: "/web", label: "Web" },
  { href: "/cli", label: "CLI" },
  { href: "/mcp", label: "MCP" },
  { href: "/api-reference", label: "API" }
];

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="yt2ctx home">
      <span className="brand-mark" aria-hidden="true">
        <svg className="brand-glyph" viewBox="0 0 24 24">
          <path className="brand-glyph-play" d="M6 4.5 L6 19.5 L15.5 12 Z" />
          <g className="brand-glyph-lines">
            <line x1="18" y1="8" x2="23" y2="8" />
            <line x1="18" y1="12" x2="21" y2="12" />
            <line x1="18" y1="16" x2="23" y2="16" />
          </g>
        </svg>
      </span>
      <span className="brand-text">
        <span className="brand-name">yt2ctx</span>
        <span className="brand-tag">cinematic context compiler</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="topbar">
      <Brand />
      <nav className="topbar-links" aria-label="Resources">
        {productLinks.map((link) => (
          <Link key={link.href} className="ghost-link" href={link.href}>
            {link.label}
          </Link>
        ))}
        <Link className="ghost-link" href="/about">
          About
        </Link>
        <a
          className="ghost-link"
          href="https://github.com/JacobFV/yt2ctx"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <Link href="/legal">Only analyze videos you have the right to download.</Link>
      <span>
        <Link href="/cli">CLI</Link> · <Link href="/mcp">MCP server</Link> ·{" "}
        <Link href="/web">Web</Link> — <Link href="/about">one pipeline</Link>.
      </span>
    </footer>
  );
}
