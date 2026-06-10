import { FadeIn } from "../components/FadeIn";
import { PricingCard } from "../components/PricingCard";
import { SectionHeader } from "../components/SectionHeader";
import { SiteNav } from "../components/SiteNav";
import { StatCard } from "../components/StatCard";
import {
  ASSETS,
  CHANNELS,
  CONTENT_PILLARS,
  DELIVERABLES,
  GOOGLE_STATS,
  IMAGES,
  INFLUENCER_CRITERIA,
  MARKET_STATS,
  META_CAMPAIGNS,
  PRICING,
  ROADMAP_WEEKS,
  STACK_OFFER,
  STRATEGY_PHASES,
  WHAT_MATTERS,
  WORK_PHASES,
} from "../data/content";

const bodyText = "text-[0.95rem] leading-[1.8] text-[var(--charcoal-mid)] sm:text-base";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <SiteNav />

      <div className="lg:pl-56 xl:pl-60">
        {/* Hero */}
        <section className="relative flex min-h-[85svh] items-end overflow-hidden sm:min-h-screen">
          <img
            src={IMAGES.heroBrunch}
            alt="San Patricio Social brunch"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,14,8,0.92)] via-[rgba(20,14,8,0.45)] to-transparent" />
          <div className="relative z-10 w-full px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:px-8 lg:pb-16">
            <FadeIn className="max-w-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-[var(--terracotta-light)]" />
                <span className="text-[0.7rem] uppercase tracking-[0.14em] text-[rgba(255,255,255,0.65)]">
                  Propuesta Comercial · Junio 2026
                </span>
              </div>
              <h1 className="font-display text-[clamp(2.2rem,8vw,3.8rem)] font-semibold leading-[1.05] text-white">
                San Patricio
                <br />
                Social
              </h1>
              <p className="mt-4 max-w-lg font-display text-[clamp(1rem,3.5vw,1.45rem)] font-light italic leading-snug text-white/85">
                Lanzamiento y posicionamiento estratégico para convertirlo en el brunch/social spot de
                referencia en Guaynabo.
              </p>
              <p className="mt-4 text-xs tracking-wide text-white/55">Preparado para Renato</p>
            </FadeIn>
          </div>
        </section>

        <main className="section-wrap pb-16 pt-8 sm:pt-10">
          {/* Introducción */}
          <section id="introduccion" className="section-gap">
            <FadeIn>
              <SectionHeader
                num="01"
                label="La Oportunidad"
                title={
                  <>
                    La gente siempre quiere probar algo nuevo.
                    <br />
                    Si el producto es bueno, regresan.
                  </>
                }
              />
              <p className={`${bodyText} max-w-2xl`}>
                El brunch es la esperanza real de este concepto, y los números del mercado lo confirman.
                La mayoría de los restaurantes nuevos no arrancan con lo que tú ya tienes.
              </p>
            </FadeIn>
            <FadeIn delay={0.1} className="mt-8 grid gap-3 sm:grid-cols-2">
              {MARKET_STATS.map((s) => (
                <StatCard key={s.value} value={s.value} label={s.label} />
              ))}
            </FadeIn>
          </section>

          {/* Base */}
          <section id="base" className="section-gap">
            <FadeIn>
              <SectionHeader
                num="02"
                label="Lo que ya tienes"
                title={
                  <>
                    La mayoría no arranca
                    <br />
                    con lo que tú ya tienes.
                  </>
                }
              />
            </FadeIn>
            <div className="grid gap-3 sm:grid-cols-2">
              {ASSETS.map((a, i) => (
                <FadeIn key={a.title} delay={i * 0.05}>
                  <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-white p-4 sm:p-5">
                    <span className="text-2xl">{a.icon}</span>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-[var(--charcoal)] sm:text-base">
                        {a.title}
                      </h3>
                      <p className="mt-1 text-[0.82rem] leading-relaxed text-[var(--charcoal-mid)]">
                        {a.detail}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Objetivo */}
          <section id="objetivo" className="section-gap">
            <FadeIn>
              <SectionHeader num="03" label="El Objetivo" title="Lo que sí importa" />
              <p className={`${bodyText} mb-6 max-w-2xl`}>
                Los detalles pequeños son los que al final van sumando. Son los que dan los resultados.
              </p>
            </FadeIn>
            <FadeIn delay={0.1} className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--cream-dark)] p-4 sm:p-5">
                <div className="mb-3 text-[0.7rem] font-bold uppercase tracking-widest text-[var(--charcoal-mid)]">
                  Lo que no importa
                </div>
                <ul className="space-y-1">
                  {WHAT_MATTERS.not.map((item) => (
                    <li
                      key={item}
                      className="border-b border-[var(--border)] py-1.5 text-sm text-[var(--charcoal-mid)] line-through opacity-50"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-[var(--terracotta)] p-4 sm:p-5">
                <div className="mb-3 text-[0.7rem] font-bold uppercase tracking-widest text-white/70">
                  Lo que sí importa
                </div>
                <ul className="space-y-1">
                  {WHAT_MATTERS.yes.map((item) => (
                    <li
                      key={item}
                      className="border-b border-white/15 py-1.5 text-sm font-semibold text-white"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </section>

          {/* Estrategia */}
          <section id="estrategia" className="section-gap">
            <FadeIn>
              <SectionHeader
                num="04"
                label="La Estrategia"
                title={
                  <>
                    No se abre en silencio.
                    <br />
                    Se llega con momentum.
                  </>
                }
              />
            </FadeIn>
            <div className="flex flex-col gap-8">
              {STRATEGY_PHASES.map((phase, i) => (
                <FadeIn key={phase.num} delay={i * 0.08}>
                  <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                    <div className="grid md:grid-cols-[1fr_1.1fr]">
                      <div className="relative min-h-[180px] md:min-h-[260px]">
                        <img
                          src={phase.img}
                          alt={phase.phase}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:bg-gradient-to-r" />
                      </div>
                      <div className="p-5 sm:p-6">
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--terracotta)]">
                          Fase {phase.num} · {phase.phase}
                        </span>
                        <h3 className="mt-2 font-display text-xl font-semibold text-[var(--charcoal)]">
                          {phase.title}
                        </h3>
                        <p className={`${bodyText} mt-3 text-sm`}>{phase.text}</p>
                        <ul className="mt-4 space-y-1.5 text-sm text-[var(--charcoal)]">
                          {phase.items.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="text-[var(--terracotta)]">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Sistema */}
          <section id="sistema" className="section-gap">
            <FadeIn>
              <SectionHeader
                num="05"
                label="El Sistema Digital"
                title={
                  <>
                    Cada canal tiene una función.
                    <br />
                    Todos trabajan juntos.
                  </>
                }
              />
              <p className={`${bodyText} mb-6 max-w-2xl`}>
                Cuando alguien escanea el menú en el local y entra a la página web, queda en retargeting.
                Cuando busca en Google, San Patricio Social aparece primero. Eso es arquitectura digital bien
                construida.
              </p>
            </FadeIn>
            <div className="grid gap-3 sm:grid-cols-2">
              {CHANNELS.map((ch, i) => (
                <FadeIn key={ch.name} delay={i * 0.04}>
                  <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xl">{ch.icon}</span>
                      <span className="rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[0.65rem] font-bold uppercase text-[var(--charcoal-mid)]">
                        {ch.priority}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-semibold">{ch.name}</h3>
                    <p className="mt-1 text-sm text-[var(--charcoal-mid)]">{ch.role}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Contenido */}
          <section id="contenido" className="section-gap">
            <FadeIn>
              <SectionHeader
                num="06"
                label="Contenido"
                title="Cada pieza tiene un trabajo específico"
              />
              <p className={`${bodyText} mb-6 max-w-2xl`}>
                Generar antojo, construir confianza, mostrar la experiencia o llevar a una acción concreta.
              </p>
            </FadeIn>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CONTENT_PILLARS.map((p, i) => (
                <FadeIn key={p.pillar} delay={i * 0.04}>
                  <div className="h-full rounded-xl border border-[var(--border)] bg-white p-4">
                    <span className="text-xl">{p.icon}</span>
                    <h3 className="mt-2 font-display text-base font-semibold">{p.pillar}</h3>
                    <p className="mt-1 text-sm text-[var(--charcoal-mid)]">{p.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Meta Ads */}
          <section id="metaads" className="section-gap">
            <FadeIn>
              <SectionHeader
                num="07"
                label="Meta Ads"
                title={
                  <>
                    El algoritmo cambió.
                    <br />
                    La mayoría todavía no lo sabe.
                  </>
                }
              />
              <p className={`${bodyText} mb-6 max-w-2xl`}>
                Andromeda transformó cómo funcionan los anuncios. Ahora el algoritmo necesita diversidad
                creativa y data de calidad para aprender rápido.
              </p>
            </FadeIn>
            <FadeIn delay={0.1} className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-[var(--cream-dark)] p-4 text-center">
                <div className="font-display text-2xl font-semibold text-[var(--terracotta)]">15-25</div>
                <div className="mt-1 text-xs text-[var(--charcoal-mid)]">Creativos mínimos</div>
              </div>
              <div className="rounded-xl bg-[var(--cream-dark)] p-4 text-center">
                <div className="font-display text-2xl font-semibold text-[var(--terracotta)]">3-5 sem</div>
                <div className="mt-1 text-xs text-[var(--charcoal-mid)]">Rotación de creativos</div>
              </div>
            </FadeIn>

            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {META_CAMPAIGNS.map(([name, goal, audience, budget]) => (
                <div key={name} className="rounded-xl border border-[var(--border)] bg-white p-4">
                  <div className="font-display font-semibold text-[var(--terracotta)]">{name}</div>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--charcoal-mid)]">Objetivo</dt>
                      <dd className="text-right font-medium">{goal}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--charcoal-mid)]">Audiencia</dt>
                      <dd className="text-right">{audience}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--charcoal-mid)]">Presupuesto</dt>
                      <dd className="font-bold text-[var(--terracotta)]">{budget}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <FadeIn delay={0.15} className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-white md:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--cream-dark)] text-left text-[0.7rem] font-bold uppercase tracking-wider text-[var(--charcoal-mid)]">
                    <th className="p-3">Campaña</th>
                    <th className="p-3">Objetivo</th>
                    <th className="p-3">Audiencia</th>
                    <th className="p-3">Presupuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {META_CAMPAIGNS.map(([name, goal, audience, budget], i) => (
                    <tr
                      key={name}
                      className={i % 2 === 0 ? "bg-white" : "bg-[var(--cream)]"}
                    >
                      <td className="p-3 font-display font-semibold text-[var(--terracotta)]">{name}</td>
                      <td className="p-3">{goal}</td>
                      <td className="p-3 text-[var(--charcoal-mid)]">{audience}</td>
                      <td className="p-3 font-bold">{budget}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FadeIn>
          </section>

          {/* Google Maps */}
          <section id="googlemaps" className="section-gap">
            <FadeIn>
              <SectionHeader num="08" label="Google Maps" title="Demanda de intención real" />
              <p className={`${bodyText} mb-6 max-w-2xl`}>
                El 93% revisa Google antes de elegir. Si San Patricio Social no aparece en esa búsqueda,
                ese cliente va a otro lugar.
              </p>
            </FadeIn>
            <div className="grid gap-3 sm:grid-cols-2">
              {GOOGLE_STATS.map((g, i) => (
                <FadeIn key={g.stat} delay={i * 0.05}>
                  <StatCard value={g.stat} label={g.label} />
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Influencers */}
          <section id="influencers" className="section-gap">
            <FadeIn>
              <SectionHeader num="09" label="Influencers" title="Selección con criterio, no con hype" />
            </FadeIn>
            <div className="grid gap-3 sm:grid-cols-2">
              {INFLUENCER_CRITERIA.map((c, i) => (
                <FadeIn key={c.criterion} delay={i * 0.04}>
                  <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                    <span className="text-lg">{c.icon}</span>
                    <h3 className="mt-2 font-display text-sm font-semibold sm:text-base">{c.criterion}</h3>
                    <p className="mt-1 text-sm text-[var(--charcoal-mid)]">{c.detail}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Roadmap + fases (merged) */}
          <section id="roadmap" className="section-gap">
            <FadeIn>
              <SectionHeader
                num="10"
                label="Plan 90 días"
                title={
                  <>
                    Calendario semana a semana.
                    <br />
                    Sin improvisar.
                  </>
                }
              />
            </FadeIn>

            {/* Phase summary — compact instead of full duplicate section */}
            <FadeIn delay={0.05} className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {WORK_PHASES.map((p) => (
                <div
                  key={p.num}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-[var(--terracotta)]">
                      {p.num}. {p.title}
                    </span>
                    <span className="shrink-0 text-[0.65rem] text-[var(--charcoal-mid)]">{p.duration}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--charcoal-mid)]">{p.objective}</p>
                </div>
              ))}
            </FadeIn>

            {/* Mobile: cards */}
            <div className="space-y-2 md:hidden">
              {ROADMAP_WEEKS.map((row, i) => (
                <FadeIn key={row.week} delay={i * 0.03}>
                  <div
                    className={`rounded-xl border border-[var(--border)] p-4 ${i % 2 === 0 ? "bg-white" : "bg-[var(--cream-dark)]"}`}
                  >
                    <div className="font-display text-sm font-semibold text-[var(--terracotta)]">
                      {row.week}
                    </div>
                    <div className="mt-1 text-sm font-bold">{row.focus}</div>
                    <p className="mt-1 text-sm text-[var(--charcoal-mid)]">{row.actions}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Desktop: table */}
            <FadeIn delay={0.1} className="hidden overflow-hidden rounded-xl border border-[var(--border)] md:block">
              <div className="grid grid-cols-[minmax(7rem,9rem)_1fr_1.2fr] gap-3 border-b border-[var(--border)] bg-[var(--cream-dark)] px-4 py-2 text-[0.7rem] font-bold uppercase tracking-wider text-[var(--charcoal-mid)]">
                <div>Semana</div>
                <div>Enfoque</div>
                <div>Acciones</div>
              </div>
              {ROADMAP_WEEKS.map((row, i) => (
                <div
                  key={row.week}
                  className={`grid grid-cols-[minmax(7rem,9rem)_1fr_1.2fr] gap-3 border-t border-[var(--border)] px-4 py-3 text-sm ${i % 2 === 0 ? "bg-white" : "bg-[var(--cream)]"}`}
                >
                  <div className="font-display font-semibold text-[var(--terracotta)]">{row.week}</div>
                  <div className="font-bold">{row.focus}</div>
                  <div className="text-[var(--charcoal-mid)]">{row.actions}</div>
                </div>
              ))}
            </FadeIn>
          </section>

          {/* Stack Offer — NEW */}
          <section id="stack-offer" className="section-gap">
            <FadeIn>
              <div className="overflow-hidden rounded-2xl border-2 border-[var(--terracotta)] bg-gradient-to-br from-[var(--terracotta-pale)] to-white">
                <div className="p-5 sm:p-8">
                  <span className="inline-block rounded-full bg-[var(--terracotta)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-white">
                    {STACK_OFFER.title}
                  </span>
                  <h2 className="mt-4 font-display text-[clamp(1.6rem,5vw,2.4rem)] font-semibold leading-tight text-[var(--charcoal)]">
                    {STACK_OFFER.subtitle}
                  </h2>
                  <p className={`${bodyText} mt-3 max-w-2xl`}>{STACK_OFFER.description}</p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {STACK_OFFER.layers.map((layer) => (
                      <div
                        key={layer.label}
                        className="rounded-xl border border-[var(--border)] bg-white/80 p-4"
                      >
                        <div className="text-xs font-bold uppercase tracking-widest text-[var(--terracotta)]">
                          {layer.label}
                        </div>
                        <ul className="mt-3 space-y-1.5 text-sm">
                          {layer.items.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="text-[var(--terracotta)]">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    <ul className="space-y-2 text-sm sm:text-base">
                      {STACK_OFFER.includes.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="font-bold text-[var(--terracotta)]">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col items-center justify-center rounded-xl bg-[var(--charcoal)] p-6 text-center text-white">
                      <div className="text-xs uppercase tracking-widest text-white/60">Inversión total</div>
                      <div className="mt-2 font-display text-4xl font-bold text-[var(--gold)] sm:text-5xl">
                        {STACK_OFFER.total}
                      </div>
                      <p className="mt-2 text-xs text-white/65">{STACK_OFFER.totalNote}</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </section>

          {/* Entregables — slimmed */}
          <section id="entregables" className="section-gap">
            <FadeIn>
              <SectionHeader
                num="11"
                label="Entregables"
                title={
                  <>
                    Lo que recibes.
                    <br />
                    Todo concreto. Todo medible.
                  </>
                }
              />
            </FadeIn>
            <div className="grid gap-3 sm:grid-cols-2">
              {DELIVERABLES.map((group, i) => (
                <FadeIn key={group.category} delay={i * 0.05}>
                  <div
                    className={`h-full rounded-xl p-4 sm:p-5 ${
                      "highlight" in group && group.highlight
                        ? "border-2 border-[var(--terracotta-light)] bg-[var(--terracotta-pale)]"
                        : "border border-[var(--border)] bg-white"
                    }`}
                  >
                    <h3
                      className={`font-display text-sm font-semibold sm:text-base ${
                        "highlight" in group && group.highlight
                          ? "text-[var(--terracotta)]"
                          : "text-[var(--charcoal)]"
                      }`}
                    >
                      {group.category}
                    </h3>
                    <ul className="mt-3 space-y-1 text-sm text-[var(--charcoal-mid)]">
                      {group.items.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Inversión */}
          <section id="inversion" className="section-gap">
            <FadeIn>
              <SectionHeader num="12" label="Inversión" title="Resumen de inversión" />
              <p className={`${bodyText} mb-8 max-w-2xl`}>
                Esto no es una mensualidad de $300 para publicar tres posts por semana. Es estrategia,
                setup completo, producción, campañas y consultoría durante los primeros meses críticos.
              </p>
            </FadeIn>
            <div className="mb-8 grid gap-4 lg:grid-cols-3">
              <FadeIn>
                <PricingCard {...PRICING.launch} />
              </FadeIn>
              <FadeIn delay={0.08}>
                <PricingCard {...PRICING.execution} highlighted />
              </FadeIn>
              <FadeIn delay={0.16}>
                <PricingCard {...PRICING.klients} />
              </FadeIn>
            </div>
            <FadeIn delay={0.2}>
              <div className="rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
                <h3 className="font-display text-base font-semibold">Desglose</h3>
                <dl className="mt-4 space-y-2">
                  {PRICING.summary.map(([label, amount]) => (
                    <div
                      key={label}
                      className="flex flex-col gap-0.5 border-b border-[var(--border)] py-2 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <dt className="text-[var(--charcoal-mid)]">{label}</dt>
                      <dd className="font-bold text-[var(--charcoal)] sm:text-right">{amount}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <span className="font-display text-lg font-semibold">Total fase de lanzamiento</span>
                  <span className="font-display text-xl font-bold text-[var(--terracotta)]">
                    {PRICING.total}
                  </span>
                </div>
                <p className="mt-3 text-xs text-[var(--charcoal-mid)]">
                  La inversión en plataformas publicitarias (Meta Ads, Google Ads) es responsabilidad del
                  cliente y no está incluida en los honorarios de consultoría.
                </p>
              </div>
            </FadeIn>
          </section>

          {/* Cierre */}
          <section id="cierre" className="section-gap">
            <FadeIn>
              <div className="relative min-h-[360px] overflow-hidden rounded-2xl sm:min-h-[420px]">
                <img
                  src={IMAGES.heroCocktail}
                  alt="San Patricio Social"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(20,14,8,0.94)] to-[rgba(20,14,8,0.72)]" />
                <div className="relative z-10 p-6 sm:p-10">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px w-8 bg-[var(--terracotta-light)]" />
                    <span className="text-xs uppercase tracking-widest text-white/60">El siguiente paso</span>
                  </div>
                  <h2 className="max-w-lg font-display text-[clamp(1.5rem,5vw,2rem)] font-semibold leading-tight text-white">
                    El concepto tiene todo para funcionar. Lo que determina el resultado es cómo se lanza.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                    El timing es correcto. Cada fin de semana que pasa sin el sistema activo es demanda que
                    se pierde.
                  </p>
                  <blockquote className="mt-6 max-w-md font-display text-lg italic text-white/90">
                    &ldquo;El brunch es mi esperanza aquí. Sábado y domingo.&rdquo;
                  </blockquote>
                  <cite className="mt-2 block text-xs not-italic text-white/50">
                    Renato, en la reunión
                  </cite>
                  <div className="mt-8 border-t border-white/20 pt-6">
                    <div className="font-display text-lg font-semibold text-white">Edgardo Hernández Medero</div>
                    <div className="mt-1 text-sm text-white/55">
                      Estrategia Digital · Marketing Gastronómico · Puerto Rico
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                      Propuesta Comercial · Junio 2026
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.1} className="mt-10 text-xs leading-relaxed text-[#aaa]">
              <div className="mb-4 font-bold uppercase tracking-widest">Aviso Legal y Términos</div>
              <p className="mb-3">
                <strong className="text-[#999]">Confidencialidad.</strong> Este documento es confidencial y
                fue preparado exclusivamente para el destinatario indicado.
              </p>
              <p className="mb-3">
                <strong className="text-[#999]">Vigencia.</strong> Vigencia de 30 días calendario a partir de
                la fecha indicada.
              </p>
              <p className="mb-3">
                <strong className="text-[#999]">Resultados no garantizados.</strong> Las proyecciones son
                estimados basados en investigación de mercado y experiencia previa.
              </p>
              <p>
                <strong className="text-[#999]">Jurisdicción.</strong> Leyes del Estado Libre Asociado de
                Puerto Rico y leyes federales aplicables de los Estados Unidos.
              </p>
            </FadeIn>
          </section>
        </main>
      </div>
    </div>
  );
}
