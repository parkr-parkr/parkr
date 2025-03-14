"use client"

import { useEffect } from "react"

export function PreventTextEditing() {
  useEffect(() => {
    // Function to handle mousedown events
    const handleMouseDown = (e) => {
      // Skip if the target is an input, textarea, or has contenteditable
      const target = e.target
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("contenteditable") === "true" ||
        target.closest("button") ||
        target.closest("a")
      ) {
        return
      }

      // For text elements, clear any existing selection to prevent caret
      if (
        target.tagName === "P" ||
        target.tagName === "H1" ||
        target.tagName === "H2" ||
        target.tagName === "H3" ||
        target.tagName === "H4" ||
        target.tagName === "H5" ||
        target.tagName === "H6" ||
        target.tagName === "SPAN" ||
        target.tagName === "DIV"
      ) {
        // This prevents the caret from appearing
        if (document.getSelection) {
          const selection = document.getSelection()
          if (selection.rangeCount > 0) {
            selection.removeAllRanges()
          }
        }
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleMouseDown)

    // Clean up event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
    }
  }, [])

  return null
}

