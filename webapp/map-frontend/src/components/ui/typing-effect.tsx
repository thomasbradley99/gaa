"use client"

import { useState, useEffect } from 'react'

interface TypingEffectProps {
  words: string[]
  speed?: number
  delay?: number
  className?: string
  cursorClassName?: string
}

export function TypingEffect({ 
  words, 
  speed = 100, 
  delay = 2000, 
  className = "",
  cursorClassName = ""
}: TypingEffectProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[currentWordIndex]
    
    if (isDeleting) {
      // Deleting effect
      if (currentText === '') {
        setIsDeleting(false)
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
        return
      }
      
      const timeout = setTimeout(() => {
        setCurrentText(currentText.slice(0, -1))
      }, speed / 2)
      
      return () => clearTimeout(timeout)
    } else {
      // Typing effect
      if (currentText === currentWord) {
        // Wait before starting to delete
        const timeout = setTimeout(() => {
          setIsDeleting(true)
        }, delay)
        
        return () => clearTimeout(timeout)
      }
      
      const timeout = setTimeout(() => {
        setCurrentText(currentWord.slice(0, currentText.length + 1))
      }, speed)
      
      return () => clearTimeout(timeout)
    }
  }, [currentText, isDeleting, currentWordIndex, words, speed, delay])

  return (
    <span className={className}>
      {currentText}
      <span className={`animate-pulse ${cursorClassName}`}>|</span>
    </span>
  )
} 