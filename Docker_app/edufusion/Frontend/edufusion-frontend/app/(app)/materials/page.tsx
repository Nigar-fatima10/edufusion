import UploadPanel from "@/components/UploadPanel";

export const metadata = { title: "My materials · EduFusion AI" };

export default function MaterialsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">My materials</h1>
      <p className="mb-8 mt-2 text-muted">Upload, organize and search everything you learn from.</p>
      <UploadPanel />
    </div>
  );
}
