import { getStartup } from "@/app/actions";
import ProfileGate from "@/components/ProfileGate";
import { currentProfile } from "@/lib/server/session";

export default async function Home() {
  const signedIn = await currentProfile();
  const startup = signedIn ? await getStartup().catch(() => null) : null;
  return (
    <main className="flex w-full flex-1 flex-col px-4 pt-8 pb-4 sm:mx-auto sm:max-w-3xl sm:px-10 sm:py-12">
      <ProfileGate signedIn={signedIn} startup={startup} />
    </main>
  );
}
