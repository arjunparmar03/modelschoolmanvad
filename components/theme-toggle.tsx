"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

import { flushSync } from "react-dom"

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()

  const toggleTheme = (e: React.MouseEvent) => {
    const currentTheme = theme === "system" ? systemTheme : theme
    const isDark = currentTheme === "dark"
    const newTheme = isDark ? "light" : "dark"

    if (!document.startViewTransition) {
      setTheme(newTheme)
      return
    }

    const x = e.clientX ?? innerWidth / 2
    const y = e.clientY ?? innerHeight / 2
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    )

    const isGoingDark = !isDark

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme)
      })
    })

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ]
      
      document.documentElement.animate(
        {
          clipPath: isGoingDark ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: 600,
          easing: "cubic-bezier(0.87, 0, 0.13, 1)", // Extra smooth ease-in-out
          fill: "forwards",
          pseudoElement: isGoingDark ? "::view-transition-old(root)" : "::view-transition-new(root)",
        }
      )
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
    >
      <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Sun className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
