import { useLocation, Link } from "wouter";
import {
  Home,
  BarChart3,
  ToggleLeft,
  FileCode,
  Zap,
  Sun,
  Moon,
  Rocket,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/use-app-state";

const NAV_ITEMS = [
  { path: "/", label: "首页", labelEn: "Home", icon: Home },
  { path: "/stats", label: "统计 & 节点", labelEn: "Stats & Nodes", icon: BarChart3 },
  { path: "/models", label: "模型管理", labelEn: "Models", icon: ToggleLeft },
  { path: "/endpoints", label: "端点文档", labelEn: "Endpoints", icon: FileCode },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { online, setShowWizard } = useAppState();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500 text-primary-foreground">
                  <Zap className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Replit2Api</span>
                  <span className="text-xs text-muted-foreground">AI Proxy Gateway</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.path ||
                  (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.path}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>操作</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setShowWizard(true)} tooltip="配置向导">
                  <Rocket />
                  <span>配置向导</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    const html = document.documentElement;
                    html.classList.toggle("dark");
                    localStorage.setItem(
                      "theme",
                      html.classList.contains("dark") ? "dark" : "light"
                    );
                  }}
                  tooltip="切换主题"
                >
                  <Sun className="dark:hidden" />
                  <Moon className="hidden dark:block" />
                  <span className="dark:hidden">暗色模式</span>
                  <span className="hidden dark:block">亮色模式</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="cursor-default">
              <div
                className={`size-2 rounded-full ${
                  online === null
                    ? "bg-muted-foreground"
                    : online
                    ? "bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]"
                    : "bg-red-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {online === null ? "检测中" : online ? "服务在线" : "服务离线"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
