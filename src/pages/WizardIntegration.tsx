import { WizardSettingsCard } from "@/components/wizard/WizardSettingsCard";
import { WizardStatusWidget } from "@/components/wizard/WizardStatusWidget";
import { WizardCatalogBrowser } from "@/components/wizard/WizardCatalogBrowser";

export default function WizardIntegration() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wizard Integration</h1>
        <p className="text-sm text-muted-foreground">
          Connect to the Bjorq Asset Wizard to browse, inspect, and import optimized 3D assets
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WizardSettingsCard />
        <WizardStatusWidget />
      </div>

      <WizardCatalogBrowser />
    </div>
  );
}
