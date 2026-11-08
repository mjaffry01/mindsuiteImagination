import {
  Activity, AppWindow, ArrowRightLeft, Blocks, Bot, Boxes, Braces, BrainCircuit, BriefcaseBusiness,
  Building2, Cable, ChartNoAxesCombined, Check, ClipboardCheck, Cloud, CloudCog, CodeXml, Compass,
  Container, Cpu, Database, Factory, FileText, Fingerprint, FlaskConical, Gauge, GitBranch, Headset,
  HeartPulse, KeyRound, Layers, LifeBuoy, LockKeyhole, Network, PackageCheck, PanelsTopLeft, Plus,
  Radio, Receipt, RefreshCw, Rocket, Route, ScanLine, Search, ShieldAlert, ShieldCheck, ShoppingBag,
  Siren, Smartphone, Stethoscope, TrendingUp, UserRoundCog, Workflow,
  DatabaseBackup, Laptop, Palette, ServerCog, UserPlus, Users,
} from 'lucide-react';

const registry = {
  Activity, AppWindow, ArrowRightLeft, Blocks, Bot, Boxes, Braces, BrainCircuit, BriefcaseBusiness,
  Building2, Cable, ChartNoAxesCombined, Check, ClipboardCheck, Cloud, CloudCog, CodeXml, Compass,
  Container, Cpu, Database, Factory, FileText, Fingerprint, FlaskConical, Gauge, GitBranch, Headset,
  HeartPulse, KeyRound, Layers, LifeBuoy, LockKeyhole, Network, PackageCheck, PanelsTopLeft, Plus,
  Radio, Receipt, RefreshCw, Rocket, Route, ScanLine, Search, ShieldAlert, ShieldCheck, ShoppingBag,
  Siren, Smartphone, Stethoscope, TrendingUp, UserRoundCog, Workflow,
  DatabaseBackup, Laptop, Palette, ServerCog, UserPlus, Users,
};

// Accepts "ShieldCheck" or "shield-check".
const toPascal = (name) => name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

export default function Icon({ name, className = 'ui-icon' }) {
  const Component = registry[toPascal(name)] || Layers;
  return <Component className={className} aria-hidden="true" focusable="false" />;
}
