import Link from "next/link";

import type { InfoPage } from "./info-content";
import { SiteFooter, SiteHeader } from "./site-chrome";

export function InfoPageView({ page }: { page: InfoPage }) {
  return (
    <main className="app">
      <div className="aurora" aria-hidden="true" />
      <SiteHeader />
      <section className="stage stage--info">
        <article className="info-page">
          <div className="info-hero">
            <span className="hero-eyebrow">{page.eyebrow}</span>
            <h1 className="hero-title">{page.title}</h1>
            <p className="hero-sub">{page.intro}</p>
            {page.cta ? (
              <Link className="btn btn-primary info-cta" href={page.cta.href}>
                {page.cta.label}
              </Link>
            ) : null}
          </div>

          <div className="info-sections">
            {page.sections.map((section) => (
              <section className="info-section" key={section.title}>
                <h2>{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.items ? (
                  <dl className="info-list">
                    {section.items.map((item) => (
                      <div key={item.term} className="info-list-row">
                        <dt>{item.term}</dt>
                        <dd>{item.description}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {section.code ? <pre className="info-code">{section.code}</pre> : null}
              </section>
            ))}
          </div>
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}
