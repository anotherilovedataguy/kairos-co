import Navbar from "./Navbar";

interface Props {
  children: React.ReactNode;
  maxWidth?: string;
}

export default function PageShell({ children, maxWidth = "max-w-5xl" }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className={`${maxWidth} mx-auto px-4 py-8`}>{children}</main>
    </div>
  );
}
