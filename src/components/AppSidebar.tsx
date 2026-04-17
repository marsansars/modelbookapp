import { LayoutDashboard, Briefcase, Receipt, BookOpen, Building2, HelpCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-6">
        <div className={`mb-8 ${collapsed ? 'px-2' : 'px-4'}`}>
          {!collapsed ? (
            <Logo heightClass="h-10" />
          ) : (
            <span className="text-primary font-heading text-2xl italic block text-center leading-none">M</span>
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
                      {!collapsed && <span className="font-body">{item.title}</span>}
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
