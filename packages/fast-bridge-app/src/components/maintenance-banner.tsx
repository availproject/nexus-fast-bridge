import { AlertTriangle } from "lucide-react";

export default function MaintenanceBanner() {
  return (
    <aside
      aria-label="Maintenance notice"
      className="fastbridge-app-banner-wrapper"
    >
      <div className="fastbridge-app-banner-inner">
        <div className="fastbridge-app-banner" role="alert">
          <AlertTriangle
            aria-hidden="true"
            className="fastbridge-app-banner-icon"
          />
          <div className="fastbridge-app-banner-text">
            <span className="fastbridge-app-banner-title">
              FastBridge is temporarily unavailable.
            </span>
            <span className="fastbridge-app-banner-subtitle">
              We're performing scheduled maintenance and will be back soon.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
