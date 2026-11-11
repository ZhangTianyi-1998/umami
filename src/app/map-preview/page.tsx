import { notFound } from 'next/navigation';
import { MapPreview } from './MapPreview';
export default function MapPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <MapPreview />;
}
