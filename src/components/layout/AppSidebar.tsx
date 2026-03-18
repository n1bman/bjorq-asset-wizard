import { Upload, Wand2, Camera, LayoutGrid, FolderPlus, Activity, Plug, ExternalLink } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import bjorqLogo from "@/assets/bjorq-wizard-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const pipelineItems = [
  { title: "Upload & Analyze", url: "/", icon: Upload },
  { title: "Optimize", url: "/optimize", icon: Wand2 },
  { title: "Photo → 3D", url: "/generate", icon: Camera },
];

const catalogItems = [
  { title: "Browse", url: "/catalog", icon: LayoutGrid },
  { title: "Ingest", url: "/ingest", icon: FolderPlus },
];

const systemItems = [
  { title: "Status", url: "/system", icon: Activity },
];

const integrationItems = [
  { title: "Wizard", url: "/wizard", icon: Plug },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isIngress = typeof window !== "undefined" && window.location.pathname.includes("/api/hassio_ingress/");
  const directUrl = `http://${typeof window !== "undefined" ? window.location.hostname : "homeassistant.local"}:3500`;
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const renderGroup = (label: string, items: typeof pipelineItems) => (
    <SidebarGroup key={label}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="hover:bg-accent/50"
                  activeClassName="bg-accent text-accent-foreground font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={bjorqLogo} alt="Bjorq Wizard" className="h-8 w-8 rounded object-cover" />
          {!collapsed && (
            <span className="font-bold text-base tracking-tight text-foreground">
              Bjorq Wizard
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Pipeline", pipelineItems)}
        {renderGroup("Catalog", catalogItems)}
        {renderGroup("System", systemItems)}
        {renderGroup("Integration", integrationItems)}
        {isIngress && (
          <div className="px-4 py-3 mt-auto">
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {!collapsed && <span>Direct mode (Port 3500)</span>}
            </a>
            {!collapsed && (
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Recommended for large file uploads
              </p>
            )}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
