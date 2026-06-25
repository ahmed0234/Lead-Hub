import React from 'react';

export default function Footer() {
  return (
    <footer className="py-6 border-t border-border/40 bg-background mt-auto">
      <div className="container mx-auto flex justify-center items-center px-4">
        <p className="text-sm text-muted-foreground font-medium">
          Project made by{" "}
          <a
            href="https://ahmedhportfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-4 transition-colors"
          >
            ~Ahmed Hassan
          </a>
        </p>
      </div>
    </footer>
  );
}
