import { LayoutDashboard, Briefcase, Receipt, BookOpen, Building2, HelpCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Agencies", url: "/agencies", icon: Building2 },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Bookkeeping", url: "/bookkeeping", icon: BookOpen },
  { title: "Guide", url: "/guide", icon: HelpCircle },
];

interface AppSidebarProps {
  displayName?: string | null;
}

export function AppSidebar({ displayName }: AppSidebarProps) {
  const { state, isMobile } = useSidebar();
  // On mobile, the sidebar opens as a full sheet — always show labels there.
  // Only hide labels when desktop sidebar is icon-collapsed.
  const showLabels = isMobile || state !== "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-6">
        <div className={`mb-8 ${showLabels ? 'px-4' : 'px-2'}`}>
          {showLabels ? (
            <h1 className="font-heading text-xl font-semibold text-gradient-gold">
              ModelBook
            </h1>
          ) : (
            <span className="text-primary font-heading text-lg font-bold block text-center">M</span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
                      activeClassName="bg-secondary text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {showLabels && <span className="font-body">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
