"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CarFront, User, LogOut, MapPin, ParkingCircle } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { useAuth } from "@/components/providers/auth-provider"
import { ListDrivewayButton } from "@/components/features/list-driveway-button"

export interface NavItem {
  label: string
  href: string
  isButton?: boolean
  variant?: "default" | "outline" | "ghost" | "link"
}

export interface NavBarProps {
  showListDriveway?: boolean
  navItems?: NavItem[]
  logoHref?: string
  logoText?: string
}

export function NavBar({
  showListDriveway = false,
  navItems = [],
  logoHref = "/",
  logoText = "ParkShare",
}: NavBarProps) {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    await logout()
    setIsMenuOpen(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={logoHref} className="flex items-center gap-2">
            <CarFront className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">{logoText}</span>
          </Link>
        </div>

        {(showListDriveway || navItems.length > 0) && (
          <nav className="hidden md:flex items-center gap-6">
            {showListDriveway && (
              <ListDrivewayButton variant="ghost" className="text-sm font-medium hover:underline underline-offset-4" />
            )}

            {navItems.map((item, index) =>
              item.isButton ? (
                <Button key={index} variant={item.variant || "ghost"} asChild>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ) : (
                <Link key={index} href={item.href} className="text-sm font-medium hover:underline underline-offset-4">
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        )}

        <div className="flex items-center gap-4">
          {isLoading ? (
            // Show loading skeleton
            <div className="h-10 w-20 animate-pulse rounded bg-muted"></div>
          ) : user ? (
            // User is logged in - show profile dropdown
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium">{user.full_name || user.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>

                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>My Bookings</span>
                    </Link>

                    <Link
                      href="/my-listings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ParkingCircle className="mr-2 h-4 w-4" />
                      <span>My Listings</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // User is not logged in - show login/signup buttons
            <>
              <Link href="/signup" className="hidden md:block text-sm font-medium hover:underline underline-offset-4">
                Sign Up
              </Link>
              <Button asChild>
                <Link href="/login">Log In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
