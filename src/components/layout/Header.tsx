// src/components/layout/Header.tsx

import { Link, useRouterState } from "@tanstack/react-router";
import { Moon, ShoppingBag, Sun, User as UserIcon, Menu, ChevronUp, Compass, LayoutGrid, ClipboardList, Home, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";
import { applyThemeClass, useTheme } from "@/store/theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = useTheme((s) => s.mode);
  const toggle = useTheme((s) => s.toggle);
  const cartCount = useCart((s) => s.items.reduce((a, b) => a + b.quantity, 0));
  const openCart = useCart((s) => s.openDrawer);
  const user = useAuth((s) => s.user);
  const isTelegram = useAuth((s) => s.isTelegram);
  const openAuth = useAuth((s) => s.openSheet);
  const signOut = useAuth((s) => s.signOut);

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => applyThemeClass(mode), [mode]);

  // Handle route change closing state automatically
  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  const isHome = pathname === "/";

  return (
    <header
      className={`sticky top-0 z-50 h-14 md:h-20 transition-colors duration-300 md:w-[800px] md:mx-auto ${
        isHome && !isExpanded ? "bg-transparent border-none" : "rounded-2xl"
      }`}
    >
      {/* Made this absolute so its layout transitions "float" over top the page instead of shifting the layout flow below */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 mx-auto mt-2 flex transition-all duration-300 px-4 md:px-8 bg-background/60 md:bg-glass md:backdrop-blur backdrop-blur shadow-2xl border border-border md:max-w-7xl md:items-center md:justify-between md:h-16 ${
          isExpanded 
            ? "max-w-[calc(100%-2rem)] w-full h-auto py-4 flex-col gap-4 rounded-2xl" 
            : "max-w-[150px] w-full h-10 items-center justify-between rounded-2xl"
        }`}
      >
        {/* Left Side: Logo Branding (Hidden on mobile collapsed/expanded layout to match original code structure) */}
        <Link to="/" className="hidden md:flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-foreground text-background">
            <span className="text-[11px] font-bold">Z</span>
          </span>
          <span className="text-base font-semibold tracking-tight">Zonic</span>
        </Link>

        {/* Center Side: Desktop Link Track */}
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">
            Discover
          </Link>
          <Link to="/catalog" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">
            Catalog
          </Link>
          {user && (
            <Link to="/orders" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">
              Orders
            </Link>
          )}
        </nav>

        {/* Right Side: Navigation Bar Action Controls */}
        <div className={`flex items-center gap-1.5 w-full md:w-auto ${isExpanded ? "justify-between" : "justify-center"}`}>
          
          {/* Mobile Collapse/Expand Action Trigger Arrow */}
          <button
            aria-label="Toggle navigation menu"
            onClick={() => setIsExpanded(!isExpanded)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
          </button>

          {/* Core Controls Stack */}
          <div className="flex items-center gap-1.5">
            <button
              aria-label="Toggle theme"
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              aria-label="Open cart"
              onClick={openCart}
              className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Desktop and Mobile Expanded User Access Area */}
            {(user || isExpanded) && (
              <div className={`${isExpanded ? "flex" : "hidden md:flex"}`}>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="ml-1 flex items-center gap-2 rounded-full border border-border bg-surface p-0.5 md:pr-3 transition-colors hover:border-gold">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={user.avatar_url} alt={user.first_name} />
                          <AvatarFallback className="bg-foreground text-background text-[11px]">
                            {user.first_name?.[0]?.toUpperCase() ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden text-xs font-medium md:inline">{user.first_name}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Signed in as
                        <div className="mt-0.5 text-sm font-medium text-foreground">
                          {user.first_name} {user.last_name ?? ""}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="text-xs">
                        <Link to="/orders">Orders</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs">Addresses</DropdownMenuItem>
                      {!isTelegram && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={signOut} className="text-xs text-destructive">
                            Sign out
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    onClick={openAuth}
                    className="ml-1 grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <UserIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Mobile Navigation Drawer Items */}
        {isExpanded && (
          <nav className="flex flex-col w-full gap-1 pt-2 border-t border-border/40 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <Link 
              to="/" 
              activeOptions={{ exact: true }} 
              activeProps={{ className: "bg-muted text-foreground" }} 
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link 
              to="/catalog" 
              activeProps={{ className: "bg-muted text-foreground" }} 
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
              Catalog
            </Link>
            {user && (
              <Link 
                to="/orders" 
                activeProps={{ className: "bg-muted text-foreground" }} 
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ClipboardList className="h-4 w-4" />
                Orders
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}