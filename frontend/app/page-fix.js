// Add this script to your project
// This will run on the client side and help identify and fix the issue

"use client"

import { useEffect } from "react"

export function PreventTextEditing() {
  useEffect(() => {
    // Prevent text selection cursor and caret
    document.addEventListener("mousedown", (e) => {
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

      // Prevent default behavior for text elements
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
        // Allow selection but prevent caret
        document.getSelection().removeAllRanges()
      }
    })

    // Check for any contenteditable elements and log them
    const editableElements = document.querySelectorAll('[contenteditable="true"]')
    if (editableElements.length > 0) {
      console.warn("Found contenteditable elements that might cause issues:", editableElements)
    }
  }, [])

  return null
}

