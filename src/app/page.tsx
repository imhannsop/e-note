import ProfileGate from "@/components/ProfileGate";

export default function Home() {
  return (
    <main className="flex w-full flex-1 flex-col px-4 pt-8 pb-4 sm:mx-auto sm:max-w-3xl sm:px-10 sm:py-12">
      <ProfileGate />
    </main>
  );
}
