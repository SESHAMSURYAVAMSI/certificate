import { notFound } from "next/navigation";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import PublicEventPage from "./PublicEventPage";

// Allow this route to render at request time instead of
// attempting to prerender MongoDB data during the build.
export const instant = false;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicEventRoute({ params }: PageProps) {
  const { slug } = await params;

  await connectDB();

  const event = await Event.findOne({
    slug: slug.toLowerCase(),
    status: "published",
  })
    .select("name slug description startDate endDate venue city organizer")
    .lean();

  if (!event) {
    notFound();
  }

  return (
    <PublicEventPage
      event={{
        name: event.name,
        slug: event.slug,
        description: event.description || "",
        startDate: new Date(event.startDate).toISOString(),
        endDate: new Date(event.endDate).toISOString(),
        venue: event.venue,
        city: event.city,
        organizer: event.organizer,
      }}
    />
  );
}
