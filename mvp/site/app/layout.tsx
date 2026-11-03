import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '消防调度救援 · 在线体验',
  description: '消防题材的轻度水资源调配解谜游戏 MVP。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
