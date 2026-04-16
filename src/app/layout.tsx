import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '순원관리 시스템',
  description: '이종환 순 관리 웹앱',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
