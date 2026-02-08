import { AppShell } from "@fastbridge/fast-bridge-core";
import config from "../config";

export default function App() {
  return <AppShell chainSlug="citrea" primaryColor={config.primaryColor} />;
}
