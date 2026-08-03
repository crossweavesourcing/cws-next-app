"use client";
import { useState, useEffect } from 'react';

export default function Typewriter({ words }: { words: string[] }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentWord = words[currentWordIndex] ?? words[0] ?? '';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (currentText !== currentWord) {
        timer = setTimeout(() => {
          setCurrentText(currentWord);
        }, 0);
      }
      return () => clearTimeout(timer); // Do not animate
    }

    if (isDeleting) {
      if (currentText === "") {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % Math.max(words.length, 1));
        }, 40);
      } else {
        timer = setTimeout(() => {
          setCurrentText((prev) => prev.slice(0, -1));
        }, 40);
      }
    } else {
      if (currentText === currentWord) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 3000);
      } else {
        timer = setTimeout(() => {
          setCurrentText(currentWord.slice(0, currentText.length + 1));
        }, 120);
      }
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words]);

  return (
    <>
      {currentText}
      <span className="animate-pulse ml-1 text-white font-light opacity-70 aria-hidden" aria-hidden="true">|</span>
    </>
  );
}
