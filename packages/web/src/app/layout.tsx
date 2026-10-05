import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Real-Time Collaborative Workspace',
  description: 'Distributed Local-First Collaborative CRDT Workspace with Yjs and Redis Pub/Sub',
};

import { AuthProvider } from '../context/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-gray-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
