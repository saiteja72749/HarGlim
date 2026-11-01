import { PageLoading } from "@/components/layout/page-loading";

// Sits inside this segment's layout, so the layout's notFound() runs before anything streams
// and a missing record returns a real 404. A loading.tsx above that layout (e.g. app/loading.tsx)
// would start the stream first and lock the status at 200.
export default PageLoading;
