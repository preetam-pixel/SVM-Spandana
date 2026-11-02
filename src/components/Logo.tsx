import Image from "next/image";
import Link from "next/link";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image src="/svm-logo.png" alt="SVM — Sangeet Vrinda x Madhyam" width={1086} height={861} priority className={small ? "h-9 w-auto" : "h-11 w-auto"} />
      <div className="leading-none">
        <div className={`font-display font-bold tracking-tight ${small ? "text-base" : "text-lg"}`}>
          Spandana <span className="font-kn text-sm font-normal text-mute">ಸ್ಪಂದನ</span>
        </div>
        {!small && <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-mute">SVM · KLE Institute of Technology</div>}
      </div>
    </Link>
  );
}
