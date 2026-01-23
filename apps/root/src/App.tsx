import { chains } from "./chains";

export default function App() {
  return (
    <div className="page">
      <header>
        <div>
          <div className="badge">Fast Bridge Hub</div>
          <h1>Pick a chain experience</h1>
        </div>
        <div className="subtitle">
          One deployment serving multiple chain-specific bridges. Each card below
          routes to the corresponding app bundle under a subpath (e.g.
          /monad), so you can add more chains without new deployments.
        </div>
      </header>

      <div className="chain-grid">
        {chains.map((chain) => {
          const accent = chain.primaryColor ?? "#111827";
          return (
            <div className="chain-card" key={chain.slug}>
              <div>
                <h2>{chain.name}</h2>
                {chain.description ? <p>{chain.description}</p> : null}
                <p>
                  Served at <strong>{chain.basePath}</strong>
                </p>
              </div>
              <a
                href={chain.basePath}
                style={{
                  background: accent,
                }}
              >
                Enter {chain.name}
              </a>
            </div>
          );
        })}
      </div>

      <div className="callout">
        Add new chains by updating <code>chains.config.json</code>, setting their
        env vars with the proper prefix, and letting Turborepo build/copy each
        dist into <code>apps/root/public/&lt;slug&gt;</code> before the root build.
      </div>
    </div>
  );
}
